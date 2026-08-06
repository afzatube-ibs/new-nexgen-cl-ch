<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Models\ExchangeRequest;
use App\Domains\Operations\Returns\Models\ReturnRequest;

/**
 * Resolves an exchange-type ReturnRequest all the way to
 * resolution_approved with a child ExchangeRequest attached, so each test
 * below only has to exercise the ExchangeRequest workflow itself.
 */
function inspectedExchangeReturnRequest(): ReturnRequest
{
    $resolver = userWithPermissions(['returns.requests.resolve']);
    $returnRequest = ReturnRequest::factory()->exchange()->inspecting()->create();

    test()->actingAs($resolver, 'sanctum')->postJson("/api/v1/return-requests/{$returnRequest->id}/resolve", [
        'resolution' => 'exchange',
        'desired_sku' => 'SKU-REPLACEMENT-1',
        'desired_quantity' => 1,
        'expected_version' => $returnRequest->lock_version,
    ])->assertOk();

    return $returnRequest->fresh();
}

it('creates a pending ExchangeRequest when an exchange-type return is resolved as exchange', function () {
    $returnRequest = inspectedExchangeReturnRequest();

    $returnRequest->refresh();
    expect($returnRequest->status)->toBe(ReturnRequest::STATUS_RESOLUTION_APPROVED);

    $exchangeRequest = ExchangeRequest::query()->where('return_request_id', $returnRequest->id)->first();
    expect($exchangeRequest)->not->toBeNull();
    expect($exchangeRequest->status)->toBe(ExchangeRequest::STATUS_PENDING);
    expect($exchangeRequest->desired_sku)->toBe('SKU-REPLACEMENT-1');
});

it('denies listing exchange requests without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/exchange-requests')
        ->assertStatus(403);
});

it('walks an exchange request through preparing, shipped, and completed', function () {
    $returnRequest = inspectedExchangeReturnRequest();
    $exchangeRequest = ExchangeRequest::query()->where('return_request_id', $returnRequest->id)->firstOrFail();
    $caller = userWithPermissions(['returns.requests.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/exchange-requests/{$exchangeRequest->id}/prepare", ['expected_version' => 1]);
    $response->assertOk()->assertJsonPath('data.status', 'preparing');

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/exchange-requests/{$exchangeRequest->id}/ship", [
        'tracking_number' => 'TRK-EXCHANGE-1',
        'expected_version' => 2,
    ]);
    $response->assertOk()
        ->assertJsonPath('data.status', 'shipped')
        ->assertJsonPath('data.trackingNumber', 'TRK-EXCHANGE-1');

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/exchange-requests/{$exchangeRequest->id}/complete", ['expected_version' => 3]);
    $response->assertOk()->assertJsonPath('data.status', 'completed');

    // Completing the ExchangeRequest also completes its parent ReturnRequest
    // (same aggregate family — Actions\CompleteExchangeRequestAction).
    expect($returnRequest->fresh()->status)->toBe(ReturnRequest::STATUS_COMPLETED);
});

it('cancels a pending exchange request', function () {
    $returnRequest = inspectedExchangeReturnRequest();
    $exchangeRequest = ExchangeRequest::query()->where('return_request_id', $returnRequest->id)->firstOrFail();
    $caller = userWithPermissions(['returns.requests.cancel']);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/exchange-requests/{$exchangeRequest->id}/cancel", ['expected_version' => 1]);

    $response->assertOk()->assertJsonPath('data.status', 'cancelled');
});

it('refuses to complete an exchange request still pending', function () {
    $returnRequest = inspectedExchangeReturnRequest();
    $exchangeRequest = ExchangeRequest::query()->where('return_request_id', $returnRequest->id)->firstOrFail();
    $caller = userWithPermissions(['returns.requests.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/exchange-requests/{$exchangeRequest->id}/complete", ['expected_version' => 1])
        ->assertStatus(422);
});

it('refuses to resolve a non-exchange-type return request as an exchange', function () {
    $resolver = userWithPermissions(['returns.requests.resolve']);
    $returnRequest = ReturnRequest::factory()->inspecting()->create();

    $this->actingAs($resolver, 'sanctum')
        ->postJson("/api/v1/return-requests/{$returnRequest->id}/resolve", [
            'resolution' => 'exchange',
            'desired_sku' => 'SKU-1',
            'desired_quantity' => 1,
            'expected_version' => $returnRequest->lock_version,
        ])
        ->assertStatus(422);
});
