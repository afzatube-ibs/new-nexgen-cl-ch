<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Commerce\Payments\Models\PaymentWebhookEvent;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

function pendingSslcommerzPayment(): Payment
{
    config(['payments.sslcommerz.store_id' => 'teststore']);
    config(['payments.sslcommerz.store_password' => 'testpass']);
    config(['payments.sslcommerz.base_url' => 'https://sandbox.sslcommerz.test']);

    $order = Order::factory()->create();
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'amount' => $order->grand_total,
        'currency_code' => $order->currency_code,
        'gateway_code' => 'sslcommerz',
    ]);

    // Mirrors what Actions\InitiatePaymentAction's recordInitiationResult
    // would have stored: an initiation PaymentAttempt whose
    // gateway_reference is the tran_id (this Payment's own id) —
    // see Gateways\SslcommerzGateway::initiate()'s docblock.
    PaymentAttempt::factory()->create([
        'payment_id' => $payment->id,
        'type' => PaymentAttempt::TYPE_INITIATION,
        'status' => PaymentAttempt::STATUS_SUCCEEDED,
        'gateway_code' => 'sslcommerz',
        'gateway_reference' => $payment->id,
    ]);

    return $payment;
}

/**
 * Posts a genuine `application/x-www-form-urlencoded` raw body — SSLCommerz's
 * real callback shape, and the shape Gateways\SslcommerzGateway::
 * verifyWebhookSignature()/parseWebhookPayload() expect to `parse_str()`.
 * Laravel's own TestCase::post() helper populates the request's parameter
 * bag directly rather than a real body stream, which would leave
 * $request->getContent() empty in the controller — this bypasses that by
 * sending the encoded string as the request's actual raw content, exactly
 * as SSLCommerz's own servers would.
 *
 * @param  array<string, string>  $payload
 */
function postSslcommerzWebhook(array $payload): TestResponse
{
    return test()->call(
        'POST',
        '/api/v1/payments/webhooks/sslcommerz',
        [],
        [],
        [],
        ['CONTENT_TYPE' => 'application/x-www-form-urlencoded'],
        http_build_query($payload),
    );
}

it('processes a valid SSLCommerz IPN, capturing the payment', function () {
    $payment = pendingSslcommerzPayment();

    Http::fake([
        'sandbox.sslcommerz.test/validator/*' => Http::response([
            'status' => 'VALID', 'amount' => $payment->amount, 'currency' => $payment->currency_code,
        ]),
    ]);

    $response = postSslcommerzWebhook([
        'val_id' => 'val-123',
        'tran_id' => $payment->id,
        'status' => 'VALID',
    ]);

    $response->assertOk();
    expect($payment->fresh()->status)->toBe(Payment::STATUS_CAPTURED);
    expect(PaymentWebhookEvent::query()->where('status', PaymentWebhookEvent::STATUS_PROCESSED)->count())->toBe(1);
});

it('never trusts an unverifiable callback: rejects it without touching the Payment', function () {
    $payment = pendingSslcommerzPayment();

    Http::fake([
        'sandbox.sslcommerz.test/validator/*' => Http::response('', 500),
    ]);

    $response = postSslcommerzWebhook([
        'val_id' => 'forged-val-id',
        'tran_id' => $payment->id,
        'status' => 'VALID',
    ]);

    $response->assertOk(); // always 200 to the gateway — see the controller's docblock.
    expect($payment->fresh()->status)->toBe(Payment::STATUS_PENDING);
    expect(PaymentWebhookEvent::query()->where('status', PaymentWebhookEvent::STATUS_REJECTED)->count())->toBe(1);
});

it('replay protection: the exact same delivery processed twice only applies the transition once', function () {
    $payment = pendingSslcommerzPayment();

    Http::fake([
        'sandbox.sslcommerz.test/validator/*' => Http::response([
            'status' => 'VALID', 'amount' => $payment->amount, 'currency' => $payment->currency_code,
        ]),
    ]);

    $payload = ['val_id' => 'val-456', 'tran_id' => $payment->id, 'status' => 'VALID'];

    postSslcommerzWebhook($payload)->assertOk();
    postSslcommerzWebhook($payload)->assertOk();

    // Only one webhook event row was recorded (the unique index on
    // (gateway_code, event_reference) is what makes this true even
    // under concurrent delivery, not merely this assertion).
    expect(PaymentWebhookEvent::query()->where('event_reference', 'val-456')->count())->toBe(1);

    // Only one capture — the payment's own status-lifecycle guard
    // (already captured -> cannot capture again) backs this up even if
    // replay protection somehow let a second attempt through.
    expect($payment->fresh()->amount_captured)->toBe($payment->amount);
});

it('records an unmatched webhook without guessing which payment it belongs to', function () {
    config(['payments.sslcommerz.store_id' => 'teststore']);
    config(['payments.sslcommerz.store_password' => 'testpass']);
    config(['payments.sslcommerz.base_url' => 'https://sandbox.sslcommerz.test']);

    Http::fake([
        'sandbox.sslcommerz.test/validator/*' => Http::response(['status' => 'VALID', 'amount' => '10.00', 'currency' => 'BDT']),
    ]);

    $response = postSslcommerzWebhook([
        'val_id' => 'val-orphan',
        'tran_id' => (string) Str::uuid(),
        'status' => 'VALID',
    ]);

    $response->assertOk();
    expect(PaymentWebhookEvent::query()->where('status', PaymentWebhookEvent::STATUS_UNMATCHED)->count())->toBe(1);
});

it('is reachable without authentication — a gateway cannot present a Sanctum token', function () {
    $payment = pendingSslcommerzPayment();

    Http::fake([
        'sandbox.sslcommerz.test/validator/*' => Http::response(['status' => 'VALID', 'amount' => $payment->amount, 'currency' => $payment->currency_code]),
    ]);

    postSslcommerzWebhook([
        'val_id' => 'val-noauth',
        'tran_id' => $payment->id,
        'status' => 'VALID',
    ])->assertOk();
});
