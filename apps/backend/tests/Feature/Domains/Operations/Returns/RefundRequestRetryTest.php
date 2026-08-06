<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Operations\Returns\Models\RefundRequest;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Support\Facades\Http;

function configuredBkashPayment(): Payment
{
    config(['payments.bkash.app_key' => 'test-app-key']);
    config(['payments.bkash.app_secret' => 'test-app-secret']);
    config(['payments.bkash.username' => 'test-user']);
    config(['payments.bkash.password' => 'test-pass']);
    config(['payments.bkash.base_url' => 'https://tokenized.sandbox.bka.sh.test/v1.2.0-beta']);

    return Payment::factory()->captured()->create([
        'gateway_code' => 'bkash',
        'amount' => '80.0000',
        'amount_captured' => '80.0000',
        'currency_code' => 'BDT',
    ]);
}

it('denies listing refund requests without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/refund-requests')
        ->assertStatus(403);
});

it('denies retrying a refund request without the resolve permission', function () {
    $caller = userWithPermissions([]);
    $refundRequest = RefundRequest::factory()->failed()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/refund-requests/{$refundRequest->id}/retry")
        ->assertStatus(403);
});

it('refuses to retry a refund request that is not failed', function () {
    $caller = userWithPermissions(['returns.requests.resolve']);
    $refundRequest = RefundRequest::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/refund-requests/{$refundRequest->id}/retry")
        ->assertStatus(422);
});

it('retries a failed refund request through to completion once the gateway is available', function () {
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/refund' => Http::response(['transactionStatus' => 'Completed', 'refundTrxID' => 'RFD-99']),
    ]);

    $payment = configuredBkashPayment();
    $returnRequest = ReturnRequest::factory()->create(['status' => ReturnRequest::STATUS_RESOLUTION_APPROVED, 'resolution' => ReturnRequest::RESOLUTION_REFUND]);
    $refundRequest = RefundRequest::factory()->failed()->create([
        'return_request_id' => $returnRequest->id,
        'payment_id' => $payment->id,
        'amount' => '80.0000',
        'currency_code' => 'BDT',
    ]);

    $response = $this->actingAs(userWithPermissions(['returns.requests.resolve']), 'sanctum')
        ->postJson("/api/v1/refund-requests/{$refundRequest->id}/retry");

    $response->assertOk()
        ->assertJsonPath('data.status', 'completed')
        ->assertJsonPath('data.gatewayReference', 'RFD-99');

    expect($returnRequest->fresh()->status)->toBe(ReturnRequest::STATUS_COMPLETED);
    expect($payment->fresh()->status)->toBe(Payment::STATUS_REFUNDED);
});
