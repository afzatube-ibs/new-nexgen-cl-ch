<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Gateways\CodGateway;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;

it('is always available — a first-class gateway, never a fallback', function () {
    expect((new CodGateway)->isAvailable())->toBeTrue();
});

it('initiates immediately with no external network call, returning pending with instructions', function () {
    $result = (new CodGateway)->initiate(new GatewayInitiationRequest(
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
    expect($result->gatewayReference)->toBeNull();
    expect($result->redirectUrl)->toBeNull();
    expect($result->instructions)->not->toBeNull();
});

it('never accepts a webhook — it has no external gateway to deliver one', function () {
    expect((new CodGateway)->verifyWebhookSignature('{}', []))->toBeFalse();
});
