<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Gateways\SslcommerzGateway;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

// Boots the application container without RefreshDatabase — these tests
// exercise real HTTP calls (faked via Http::fake()) and the app()
// container, neither of which needs a database.
uses(TestCase::class);

function sslcommerzGateway(): SslcommerzGateway
{
    return new SslcommerzGateway([
        'store_id' => 'teststore',
        'store_password' => 'testpass',
        'base_url' => 'https://sandbox.sslcommerz.test',
    ], app(HttpFactory::class));
}

it('is unavailable without store credentials', function () {
    $gateway = new SslcommerzGateway([], app(HttpFactory::class));

    expect($gateway->isAvailable())->toBeFalse();
});

it('is available with store credentials configured', function () {
    expect(sslcommerzGateway()->isAvailable())->toBeTrue();
});

it('initiates a hosted checkout session and returns the redirect URL', function () {
    Http::fake([
        'sandbox.sslcommerz.test/gwprocess/*' => Http::response([
            'status' => 'SUCCESS',
            'sessionkey' => 'session-abc',
            'GatewayPageURL' => 'https://sandbox.sslcommerz.test/gw/session-abc',
        ]),
    ]);

    $result = sslcommerzGateway()->initiate(new GatewayInitiationRequest(
        paymentId: 'pay-1',
        orderId: 'order-1',
        amount: '100.0000',
        currencyCode: 'BDT',
        customerEmail: 'buyer@example.test',
        customerPhone: '01700000000',
        description: 'Order ORD-1',
        successCallbackUrl: 'https://example.test/success',
        failureCallbackUrl: 'https://example.test/failure',
        cancelCallbackUrl: 'https://example.test/cancel',
    ));

    expect($result->status)->toBe('pending');
    // gatewayReference is `tran_id` — this Payment's own id, chosen at
    // request time — not the gateway's `sessionkey`, per initiate()'s
    // docblock; the round-tripping identifier every SSLCommerz callback
    // actually carries back.
    expect($result->gatewayReference)->toBe('pay-1');
    expect($result->redirectUrl)->toBe('https://sandbox.sslcommerz.test/gw/session-abc');
});

it('reports initiation as failed when the gateway does not respond with SUCCESS', function () {
    Http::fake([
        'sandbox.sslcommerz.test/gwprocess/*' => Http::response(['status' => 'FAILED']),
    ]);

    $result = sslcommerzGateway()->initiate(new GatewayInitiationRequest(
        paymentId: 'pay-1',
        orderId: 'order-1',
        amount: '100.0000',
        currencyCode: 'BDT',
        customerEmail: null,
        customerPhone: null,
        description: 'Order ORD-1',
        successCallbackUrl: 'https://example.test/success',
        failureCallbackUrl: 'https://example.test/failure',
        cancelCallbackUrl: 'https://example.test/cancel',
    ));

    expect($result->status)->toBe('failed');
});

it('verifies a webhook by re-validating with the Order Validation API, never trusting the callback alone', function () {
    Http::fake([
        'sandbox.sslcommerz.test/validator/*' => Http::response(['status' => 'VALID', 'amount' => '100.00', 'currency' => 'BDT']),
    ]);

    $isValid = sslcommerzGateway()->verifyWebhookSignature('val_id=xyz&tran_id=pay-1&status=VALID', []);

    expect($isValid)->toBeTrue();
});

it('rejects a webhook whose val_id the Validation API cannot confirm', function () {
    Http::fake([
        'sandbox.sslcommerz.test/validator/*' => Http::response('', 500),
    ]);

    $isValid = sslcommerzGateway()->verifyWebhookSignature('val_id=forged&tran_id=pay-1&status=VALID', []);

    expect($isValid)->toBeFalse();
});

it('normalizes a validated webhook payload to captured', function () {
    Http::fake([
        'sandbox.sslcommerz.test/validator/*' => Http::response(['status' => 'VALID', 'amount' => '100.00', 'currency' => 'BDT']),
    ]);

    $notification = sslcommerzGateway()->parseWebhookPayload('val_id=xyz&tran_id=pay-1&status=VALID', []);

    expect($notification->status)->toBe('captured');
    expect($notification->gatewayReference)->toBe('pay-1');
    expect($notification->eventReference)->toBe('xyz');
});
