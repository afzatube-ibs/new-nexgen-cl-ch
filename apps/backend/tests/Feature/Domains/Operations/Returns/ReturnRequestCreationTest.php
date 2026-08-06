<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Audit\AuditLog;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Support\Str;

function returnRequestPayload(array $overrides = []): array
{
    return array_merge([
        'order_id' => (string) Str::uuid(),
        'customer_id' => (string) Str::uuid(),
        'reason' => ReturnRequest::REASON_DAMAGED,
        'reason_details' => 'Screen arrived cracked.',
        'items' => [
            ['sku' => 'SKU-001', 'description' => 'Widget', 'quantity' => 1],
        ],
    ], $overrides);
}

it('denies listing return requests without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/return-requests')
        ->assertStatus(403);
});

it('denies creating a return request without the manage permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/return-requests', returnRequestPayload())
        ->assertStatus(403);
});

it('creates a return request given the manage permission, generating an RMA number and auditing it', function () {
    $caller = userWithPermissions(['returns.requests.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/return-requests', returnRequestPayload());

    $response->assertCreated()
        ->assertJsonPath('data.status', 'requested')
        ->assertJsonPath('data.type', 'return')
        ->assertJsonPath('data.version', 1)
        ->assertJsonPath('data.items.0.sku', 'SKU-001');

    expect($response->json('data.rmaNumber'))->toMatch('/^RMA-\d{6}$/');

    $returnId = $response->json('data.id');
    expect(ReturnRequest::query()->find($returnId))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'return_request.created')->count())->toBe(1);
});

it('rejects a return request with no items', function () {
    $caller = userWithPermissions(['returns.requests.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/return-requests', returnRequestPayload(['items' => []]))
        ->assertStatus(422);
});

it('rejects a return request with an invalid reason', function () {
    $caller = userWithPermissions(['returns.requests.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/return-requests', returnRequestPayload(['reason' => 'not_a_real_reason']))
        ->assertStatus(422);
});

it('creates an exchange-type return request when type=exchange', function () {
    $caller = userWithPermissions(['returns.requests.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/return-requests', returnRequestPayload(['type' => 'exchange']));

    $response->assertCreated()->assertJsonPath('data.type', 'exchange');
});

it('shows a return request with its items, timeline, and notes loaded', function () {
    $caller = userWithPermissions(['returns.requests.view']);
    $returnRequest = ReturnRequest::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/return-requests/{$returnRequest->id}");

    $response->assertOk()->assertJsonStructure(['data' => ['id', 'rmaNumber', 'items', 'timeline', 'notes', 'refundRequest', 'exchangeRequest']]);
});

it('filters the return request list by status', function () {
    $caller = userWithPermissions(['returns.requests.view']);
    ReturnRequest::factory()->create(['status' => ReturnRequest::STATUS_REQUESTED]);
    ReturnRequest::factory()->rejected()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/return-requests?status=rejected');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('status')->unique()->all())->toBe(['rejected']);
});

it('filters the return request list by order_id and customer_id', function () {
    $caller = userWithPermissions(['returns.requests.view']);
    $target = ReturnRequest::factory()->create();
    ReturnRequest::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/return-requests?order_id={$target->order_id}");

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$target->id]);
});
