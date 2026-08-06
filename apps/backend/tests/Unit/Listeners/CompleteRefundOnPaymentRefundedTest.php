<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Events\PaymentRefunded;
use App\Domains\Operations\Returns\Models\RefundRequest;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

// The reverse direction of ProcessRefundOnReturnResolvedTest — tested here
// in isolation (a directly-published PaymentRefunded, not one produced by
// RefundPaymentAction) since the forward direction already covers the
// full chain end-to-end.
uses(TestCase::class, RefreshDatabase::class);

it('completes the matching, still-processing RefundRequest when PaymentRefunded is published', function () {
    $returnRequest = ReturnRequest::factory()->create(['status' => ReturnRequest::STATUS_RESOLUTION_APPROVED, 'resolution' => ReturnRequest::RESOLUTION_REFUND]);
    $refundRequest = RefundRequest::factory()->processing()->create([
        'return_request_id' => $returnRequest->id,
        'payment_id' => $paymentId = (string) Str::uuid(),
        'amount' => '60.0000',
        'currency_code' => 'BDT',
    ]);

    app(DomainEventBus::class)->publish(new PaymentRefunded(
        paymentId: $paymentId,
        orderId: $returnRequest->order_id,
        customerId: $returnRequest->customer_id,
        gatewayCode: 'bkash',
        amount: '60.0000',
        currencyCode: 'BDT',
        refundReference: 'RFD-DIRECT-1',
    ));

    expect($refundRequest->fresh()->status)->toBe(RefundRequest::STATUS_COMPLETED);
    expect($refundRequest->fresh()->gateway_reference)->toBe('RFD-DIRECT-1');
    expect($returnRequest->fresh()->status)->toBe(ReturnRequest::STATUS_COMPLETED);
});

it('is a no-op when no matching processing RefundRequest exists', function () {
    app(DomainEventBus::class)->publish(new PaymentRefunded(
        paymentId: (string) Str::uuid(),
        orderId: (string) Str::uuid(),
        customerId: null,
        gatewayCode: 'bkash',
        amount: '10.0000',
        currencyCode: 'BDT',
        refundReference: 'RFD-ORPHAN',
    ));
})->throwsNoExceptions();

it('ignores a RefundRequest for the same payment that is not currently processing', function () {
    $returnRequest = ReturnRequest::factory()->create();
    $refundRequest = RefundRequest::factory()->completed()->create([
        'return_request_id' => $returnRequest->id,
        'payment_id' => $paymentId = (string) Str::uuid(),
        'gateway_reference' => 'RFD-ALREADY-DONE',
    ]);

    app(DomainEventBus::class)->publish(new PaymentRefunded(
        paymentId: $paymentId,
        orderId: $returnRequest->order_id,
        customerId: null,
        gatewayCode: 'bkash',
        amount: '10.0000',
        currencyCode: 'BDT',
        refundReference: 'RFD-SHOULD-NOT-APPLY',
    ));

    expect($refundRequest->fresh()->gateway_reference)->toBe('RFD-ALREADY-DONE');
});
