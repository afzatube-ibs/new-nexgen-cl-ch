<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Gateways\NagadGateway;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

// Boots the application container without RefreshDatabase — these tests
// exercise real HTTP calls (faked via Http::fake()) and the app()
// container, neither of which needs a database.
uses(TestCase::class);

/**
 * A real, freshly-generated RSA keypair for these tests — Gateways\
 * NagadGateway's `encrypt()`/`sign()` use genuine openssl_public_encrypt()/
 * openssl_sign() calls, not stubs, so a real key is required to exercise
 * them; this keypair has no relationship to any actual Nagad merchant
 * credential.
 *
 * @return array{merchant_private_key: string, nagad_public_key: string}
 */
function nagadTestKeypair(): array
{
    // `config` is this test environment's own OpenSSL configuration file
    // location — a local-machine detail openssl_pkey_new() needs to find
    // its default settings, entirely unrelated to Gateways\NagadGateway's
    // own production code, which only ever calls openssl_sign()/
    // openssl_public_encrypt() against PEM keys already supplied via
    // configuration, never generates a keypair itself.
    $opensslConfig = array_values(array_filter([
        getenv('OPENSSL_CONF') ?: null,
        'C:/tools/php84/extras/ssl/openssl.cnf',
        '/etc/ssl/openssl.cnf',
    ], fn (?string $path) => $path !== null && is_file($path)))[0] ?? null;

    $options = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];

    if ($opensslConfig !== null) {
        $options['config'] = $opensslConfig;
    }

    $resource = openssl_pkey_new($options);
    openssl_pkey_export($resource, $privateKeyPem, null, $options);
    $publicKeyPem = openssl_pkey_get_details($resource)['key'];

    return ['merchant_private_key' => $privateKeyPem, 'nagad_public_key' => $publicKeyPem];
}

function nagadGateway(): NagadGateway
{
    $keys = nagadTestKeypair();

    return new NagadGateway([
        'merchant_id' => 'testmerchant',
        'merchant_private_key' => $keys['merchant_private_key'],
        'nagad_public_key' => $keys['nagad_public_key'],
        'base_url' => 'https://sandbox.mynagad.test:10080/remote-payment-gateway-1.0',
    ], app(HttpFactory::class));
}

it('is unavailable without full credentials', function () {
    $gateway = new NagadGateway(['merchant_id' => 'only-this'], app(HttpFactory::class));

    expect($gateway->isAvailable())->toBeFalse();
});

it('is available with full credentials configured', function () {
    expect(nagadGateway()->isAvailable())->toBeTrue();
});

it('completes the two-step initialize/complete handshake and returns the redirect URL', function () {
    Http::fake([
        '*/check-out/initialize/*' => Http::response(['paymentReferenceId' => 'ref-abc', 'challenge' => 'chal-1']),
        '*/check-out/complete/*' => Http::response(['callBackUrl' => 'https://mynagad.test/checkout/ref-abc']),
    ]);

    $result = nagadGateway()->initiate(new GatewayInitiationRequest(
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

    expect($result->status)->toBe('pending');
    expect($result->gatewayReference)->toBe('ref-abc');
    expect($result->redirectUrl)->toBe('https://mynagad.test/checkout/ref-abc');
});

it('verifies a webhook by re-querying the Verify Payment API, never trusting the callback alone', function () {
    Http::fake([
        '*/verify/payment/*' => Http::response(['status' => 'Success', 'amount' => '100']),
    ]);

    $isValid = nagadGateway()->verifyWebhookSignature(json_encode(['payment_ref_id' => 'ref-abc']), []);

    expect($isValid)->toBeTrue();
});

it('rejects a webhook for a reference Nagad does not recognize', function () {
    Http::fake([
        '*/verify/payment/*' => Http::response('', 404),
    ]);

    $isValid = nagadGateway()->verifyWebhookSignature(json_encode(['payment_ref_id' => 'forged']), []);

    expect($isValid)->toBeFalse();
});

it('normalizes a successful webhook payload to captured', function () {
    Http::fake([
        '*/verify/payment/*' => Http::response(['status' => 'Success', 'amount' => '100']),
    ]);

    $notification = nagadGateway()->parseWebhookPayload(json_encode(['payment_ref_id' => 'ref-abc']), []);

    expect($notification->status)->toBe('captured');
    expect($notification->gatewayReference)->toBe('ref-abc');
});

it('normalizes an aborted webhook payload to cancelled', function () {
    Http::fake([
        '*/verify/payment/*' => Http::response(['status' => 'Aborted']),
    ]);

    $notification = nagadGateway()->parseWebhookPayload(json_encode(['payment_ref_id' => 'ref-abc']), []);

    expect($notification->status)->toBe('cancelled');
});
