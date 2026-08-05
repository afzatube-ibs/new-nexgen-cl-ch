<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Gateways\BankTransferGateway;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;

it('is unavailable without configured bank account details', function () {
    expect((new BankTransferGateway([]))->isAvailable())->toBeFalse();
});

it('is available once bank account details are configured', function () {
    $gateway = new BankTransferGateway([
        'bank_name' => 'Example Bank',
        'account_name' => 'neXgen Store',
        'account_number' => '1234567890',
    ]);

    expect($gateway->isAvailable())->toBeTrue();
});

it('initiates with a generated reference and human-readable transfer instructions, no redirect', function () {
    $gateway = new BankTransferGateway([
        'bank_name' => 'Example Bank',
        'account_name' => 'neXgen Store',
        'account_number' => '1234567890',
        'branch' => 'Gulshan',
    ]);

    $result = $gateway->initiate(new GatewayInitiationRequest(
        paymentId: 'pay-1',
        orderId: 'order-1',
        amount: '250.5000',
        currencyCode: 'BDT',
        customerEmail: null,
        customerPhone: null,
        description: 'Order ORD-1',
        successCallbackUrl: 'https://example.test/success',
        failureCallbackUrl: 'https://example.test/failure',
        cancelCallbackUrl: 'https://example.test/cancel',
    ));

    expect($result->status)->toBe('pending');
    expect($result->gatewayReference)->toStartWith('BT-');
    expect($result->redirectUrl)->toBeNull();
    expect($result->instructions)->toContain('250.5000');
    expect($result->instructions)->toContain('Example Bank');
    expect($result->instructions)->toContain($result->gatewayReference);
});

it('never accepts a webhook — verification is always the human Admin Verification workflow', function () {
    expect((new BankTransferGateway([]))->verifyWebhookSignature('{}', []))->toBeFalse();
});
