<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Support\Str;

it('denies approving without the approve permission', function () {
    $caller = userWithPermissions([]);
    $returnRequest = ReturnRequest::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/approve", ['expected_version' => 1])
        ->assertStatus(403);
});

it('walks a return request through approve, pickup, receive, inspect, and reject', function () {
    // Set before any request in this test resolves the workflow
    // controller — Couriers\ProviderRegistry is a singleton built once,
    // lazily, from config on first resolution (mirrors Payments'
    // GatewayRegistry); setting it after that first resolution would be
    // too late, since the controller's constructor eagerly resolves
    // every action it depends on, including SchedulePickupAction, on the
    // very first request to any of its methods.
    config(['shipping.steadfast.api_key' => 'key', 'shipping.steadfast.secret_key' => 'secret']);

    $approver = userWithPermissions(['returns.requests.approve']);
    $manager = userWithPermissions(['returns.requests.manage']);
    $inspector = userWithPermissions(['returns.requests.inspect']);
    $resolver = userWithPermissions(['returns.requests.resolve']);

    $returnRequest = ReturnRequest::factory()->create();

    $response = $this->actingAs($approver, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/approve", ['expected_version' => 1]);
    $response->assertOk()->assertJsonPath('data.status', 'approved');

    $response = $this->actingAs($manager, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/pickup", [
        'provider_code' => 'steadfast',
        'tracking_number' => 'PICKUP-1',
        'expected_version' => 2,
    ]);
    $response->assertOk()
        ->assertJsonPath('data.status', 'pickup_scheduled')
        ->assertJsonPath('data.pickup.providerCode', 'steadfast')
        ->assertJsonPath('data.pickup.trackingNumber', 'PICKUP-1');

    $response = $this->actingAs($inspector, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/receive", ['expected_version' => 3]);
    $response->assertOk()->assertJsonPath('data.status', 'received');

    $response = $this->actingAs($inspector, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/inspect", ['expected_version' => 4]);
    $response->assertOk()->assertJsonPath('data.status', 'inspecting');

    $response = $this->actingAs($resolver, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/resolve", [
        'resolution' => 'reject',
        'resolution_notes' => 'Item shows normal wear, not defective.',
        'expected_version' => 5,
    ]);
    $response->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.resolution', 'reject');

    $returnRequest->refresh();
    expect($returnRequest->timelineEvents()->count())->toBeGreaterThanOrEqual(5);
});

it('refuses to schedule a pickup with an unregistered courier', function () {
    $caller = userWithPermissions(['returns.requests.manage']);
    $returnRequest = ReturnRequest::factory()->approved()->create(['lock_version' => 2]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/pickup", [
            'provider_code' => 'not-a-real-courier',
            'expected_version' => 2,
        ])
        ->assertStatus(422);
});

it('rejects a return request before receipt with a reason', function () {
    $caller = userWithPermissions(['returns.requests.approve']);
    $returnRequest = ReturnRequest::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/reject", [
        'reason' => 'Outside the return window.',
        'expected_version' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejectionReason', 'Outside the return window.');
});

it('cancels a return request before it is received', function () {
    $caller = userWithPermissions(['returns.requests.cancel']);
    $returnRequest = ReturnRequest::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/cancel", ['expected_version' => 1]);

    $response->assertOk()->assertJsonPath('data.status', 'cancelled');
});

it('refuses to cancel a received return request', function () {
    $caller = userWithPermissions(['returns.requests.cancel']);
    $returnRequest = ReturnRequest::factory()->received()->create(['lock_version' => 3]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/cancel", ['expected_version' => 3])
        ->assertStatus(422);
});

it('rejects a stale expected_version on a workflow transition as a 409 conflict', function () {
    $caller = userWithPermissions(['returns.requests.approve']);
    $returnRequest = ReturnRequest::factory()->create();
    $returnRequest->update(['reason_details' => 'changed']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/approve", ['expected_version' => 1])
        ->assertStatus(409);
});

it('refuses to resolve as exchange when the return was not filed as an exchange', function () {
    $caller = userWithPermissions(['returns.requests.resolve']);
    $returnRequest = ReturnRequest::factory()->inspecting()->create(['lock_version' => 4]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/resolve", [
            'resolution' => 'exchange',
            'desired_sku' => 'SKU-002',
            'desired_quantity' => 1,
            'expected_version' => 4,
        ])
        ->assertStatus(422);
});

it('resolving as refund creates a RefundRequest carrying the given payment details', function () {
    // Resolution itself (this HTTP response) always reflects the
    // synchronous, in-request decision: resolution_approved plus a
    // RefundRequest snapshotting exactly what was submitted. What
    // happens to that RefundRequest next (it starts processing against
    // a real Payment synchronously, in the same request, per
    // Events\ReturnResolved's own docblock) is a separate concern this
    // test intentionally does not assert on — see Tests\Unit\Listeners\
    // ProcessRefundOnReturnResolvedTest and Tests\Feature\...\
    // RefundRequestRetryTest for that.
    $caller = userWithPermissions(['returns.requests.resolve']);
    $returnRequest = ReturnRequest::factory()->inspecting()->create(['lock_version' => 4]);
    $paymentId = (string) Str::uuid();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/resolve", [
            'resolution' => 'refund',
            'payment_id' => $paymentId,
            'amount' => '50.00',
            'currency_code' => 'BDT',
            'expected_version' => 4,
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'resolution_approved')
        ->assertJsonPath('data.resolution', 'refund')
        ->assertJsonPath('data.refundRequest.paymentId', $paymentId)
        ->assertJsonPath('data.refundRequest.amount', '50.0000')
        ->assertJsonPath('data.refundRequest.currencyCode', 'BDT');
});
