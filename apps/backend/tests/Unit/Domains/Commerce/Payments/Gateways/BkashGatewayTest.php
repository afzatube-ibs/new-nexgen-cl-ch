<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Gateways\BkashGateway;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

// Boots the application container without RefreshDatabase — these tests
// exercise real HTTP calls (faked via Http::fake()), the cache, and the
// app() container, none of which needs a database.
uses(TestCase::class);

beforeEach(function () {
    // The id-token cache (Gateways\BkashGateway::idToken()) lives outside
    // RefreshDatabase's reach — cleared explicitly so each test's grant/
    // no-grant assertions are never contaminated by a token an earlier
    // test in this file already cached under the same app_key.
    Cache::flush();
});

function bkashGateway(): BkashGateway
{
    return new BkashGateway([
        'app_key' => 'test-app-key',
        'app_secret' => 'test-app-secret',
        'username' => 'test-user',
        'password' => 'test-pass',
        'base_url' => 'https://tokenized.sandbox.bka.sh.test/v1.2.0-beta',
    ], app(HttpFactory::class));
}

it('is unavailable without full credentials', function () {
    $gateway = new BkashGateway(['app_key' => 'only-this'], app(HttpFactory::class));

    expect($gateway->isAvailable())->toBeFalse();
});

it('is available with full credentials configured', function () {
    expect(bkashGateway()->isAvailable())->toBeTrue();
});

it('grants a token then creates a payment, returning the bKash redirect URL', function () {
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/checkout/create' => Http::response([
            'statusCode' => '0000',
            'paymentID' => 'TR0011abc',
            'bkashURL' => 'https://tokenized.sandbox.bka.sh.test/checkout/TR0011abc',
        ]),
    ]);

    $result = bkashGateway()->initiate(new GatewayInitiationRequest(
        paymentId: 'pay-1',
        orderId: 'order-1',
        amount: '100.0000',
        currencyCode: 'BDT',
        customerEmail: 'buyer@example.test',
        customerPhone: null,
        description: 'Order ORD-1',
        successCallbackUrl: 'https://example.test/success',
        failureCallbackUrl: 'https://example.test/failure',
        cancelCallbackUrl: 'https://example.test/cancel',
    ));

    expect($result->status)->toBe('pending');
    expect($result->gatewayReference)->toBe('TR0011abc');
    expect($result->redirectUrl)->toBe('https://tokenized.sandbox.bka.sh.test/checkout/TR0011abc');

    Http::assertSent(fn ($request) => str_contains((string) $request->url(), 'token/grant'));
    Http::assertSent(fn ($request) => str_contains((string) $request->url(), 'checkout/create'));
});

it('verifies a webhook by re-querying Query Payment, never trusting the callback status alone', function () {
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/status/*' => Http::response([
            'paymentID' => 'TR0011abc',
            'transactionStatus' => 'Completed',
            'amount' => '100',
            'currency' => 'BDT',
        ]),
    ]);

    $isValid = bkashGateway()->verifyWebhookSignature(json_encode(['paymentID' => 'TR0011abc', 'status' => 'success']), []);

    expect($isValid)->toBeTrue();
});

it('rejects a webhook for a paymentID bKash does not recognize', function () {
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/status/*' => Http::response('', 404),
    ]);

    $isValid = bkashGateway()->verifyWebhookSignature(json_encode(['paymentID' => 'forged']), []);

    expect($isValid)->toBeFalse();
});

it('normalizes a confirmed webhook payload to captured', function () {
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/status/*' => Http::response([
            'paymentID' => 'TR0011abc',
            'transactionStatus' => 'Completed',
            'amount' => '100',
            'currency' => 'BDT',
        ]),
    ]);

    $notification = bkashGateway()->parseWebhookPayload(json_encode(['paymentID' => 'TR0011abc']), []);

    expect($notification->status)->toBe('captured');
    expect($notification->gatewayReference)->toBe('TR0011abc');
});

it('caches the id token rather than re-granting on every call within its lifetime', function () {
    Http::fake([
        '*/token/grant' => Http::response(['id_token' => 'token-abc', 'expires_in' => 3600]),
        '*/payment/status/*' => Http::response(['paymentID' => 'TR0011abc', 'transactionStatus' => 'Completed']),
    ]);

    $gateway = bkashGateway();
    $gateway->queryStatus('TR0011abc');
    $gateway->queryStatus('TR0011abc');

    Http::assertSentCount(3); // one grant + two status queries, not two grants + two queries.
});
