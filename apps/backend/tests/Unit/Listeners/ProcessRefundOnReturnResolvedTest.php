<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Operations\Returns\Events\ReturnResolved;
use App\Domains\Operations\Returns\Models\RefundRequest;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

// The platform's third cross-domain event-routing seam (after
// CreateShipmentOnOrderPlaced and CompleteRefundOnPaymentRefunded) — this
// test exercises the whole wiring path (App\Providers\AppServiceProvider's
// subscription, through the in-process Laravel dispatcher, to Payments'
// own RefundPaymentAction, and — since RefundPaymentAction itself
// publishes PaymentRefunded synchronously — through the *second*
// listener, CompleteRefundOnPaymentRefunded, all the way back to Returns'
// own CompleteRefundRequestAction), mirroring tests/Unit/Listeners/
// CreateShipmentOnOrderPlacedTest.php's own "publish on the real,
// application-wired bus" approach.
uses(TestCase::class, RefreshDatabase::class);

it('drives a refund all the way to completion when ReturnResolved is published on the real event bus', function () {
    config(['payments.bkash.app_key' => 'test-app-key']);
    config(['payments.bkash.app_secret' => 'test-app-secret']);
    config(['payments.bkash.username' => 'test-user']);
    config(['payments.bkash.password' => 'test-pass']);
    config(['payments.bkash.base_url' => 'https://tokenized.sandbox.bka.sh.test/v1.2.0-beta']);

    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/refund' => Http::response(['transactionStatus' => 'Completed', 'refundTrxID' => 'RFD-CHAIN-1']),
    ]);

    $payment = Payment::factory()->captured()->create([
        'gateway_code' => 'bkash',
        'amount' => '75.0000',
        'amount_captured' => '75.0000',
        'currency_code' => 'BDT',
    ]);
    $returnRequest = ReturnRequest::factory()->create([
        'status' => ReturnRequest::STATUS_RESOLUTION_APPROVED,
        'resolution' => ReturnRequest::RESOLUTION_REFUND,
    ]);
    $refundRequest = RefundRequest::factory()->create([
        'return_request_id' => $returnRequest->id,
        'payment_id' => $payment->id,
        'amount' => '75.0000',
        'currency_code' => 'BDT',
    ]);

    app(DomainEventBus::class)->publish(new ReturnResolved(
        returnRequestId: $returnRequest->id,
        orderId: $returnRequest->order_id,
        resolution: 'refund',
        refundRequestId: $refundRequest->id,
        paymentId: $payment->id,
        amount: '75.0000',
        currencyCode: 'BDT',
    ));

    expect($refundRequest->fresh()->status)->toBe(RefundRequest::STATUS_COMPLETED);
    expect($refundRequest->fresh()->gateway_reference)->toBe('RFD-CHAIN-1');
    expect($returnRequest->fresh()->status)->toBe(ReturnRequest::STATUS_COMPLETED);
    expect($payment->fresh()->status)->toBe(Payment::STATUS_REFUNDED);
});

it('marks the RefundRequest failed, without throwing, when the payment gateway does not support refunds', function () {
    $payment = Payment::factory()->captured()->create(['gateway_code' => 'cod', 'amount' => '40.0000', 'amount_captured' => '40.0000']);
    $returnRequest = ReturnRequest::factory()->create(['status' => ReturnRequest::STATUS_RESOLUTION_APPROVED, 'resolution' => ReturnRequest::RESOLUTION_REFUND]);
    $refundRequest = RefundRequest::factory()->create([
        'return_request_id' => $returnRequest->id,
        'payment_id' => $payment->id,
        'amount' => '40.0000',
    ]);

    app(DomainEventBus::class)->publish(new ReturnResolved(
        returnRequestId: $returnRequest->id,
        orderId: $returnRequest->order_id,
        resolution: 'refund',
        refundRequestId: $refundRequest->id,
        paymentId: $payment->id,
        amount: '40.0000',
        currencyCode: 'BDT',
    ));

    expect($refundRequest->fresh()->status)->toBe(RefundRequest::STATUS_FAILED);
    expect($refundRequest->fresh()->failure_reason)->not->toBeNull();
    // The ReturnRequest's own resolution already committed before
    // ReturnResolved was published — a downstream refund failure does not
    // retroactively change it.
    expect($returnRequest->fresh()->status)->toBe(ReturnRequest::STATUS_RESOLUTION_APPROVED);
});

it('is a no-op for a reject or exchange resolution', function () {
    app(DomainEventBus::class)->publish(new ReturnResolved(
        returnRequestId: (string) Str::uuid(),
        orderId: (string) Str::uuid(),
        resolution: 'exchange',
        refundRequestId: null,
        paymentId: null,
        amount: null,
        currencyCode: null,
    ));
})->throwsNoExceptions();
