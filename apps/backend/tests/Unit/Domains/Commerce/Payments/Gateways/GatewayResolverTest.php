<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Exceptions\UnsupportedGatewayException;
use App\Domains\Commerce\Payments\Gateways\BankTransferGateway;
use App\Domains\Commerce\Payments\Gateways\CodGateway;
use App\Domains\Commerce\Payments\Gateways\GatewayRegistry;
use App\Domains\Commerce\Payments\Gateways\GatewayResolver;

it('resolves a registered, available gateway', function () {
    $registry = new GatewayRegistry;
    $registry->register(new CodGateway);
    $resolver = new GatewayResolver($registry);

    expect($resolver->resolve('cod'))->toBeInstanceOf(CodGateway::class);
});

it('refuses to resolve an unregistered gateway code', function () {
    $resolver = new GatewayResolver(new GatewayRegistry);

    expect(fn () => $resolver->resolve('does-not-exist'))
        ->toThrow(UnsupportedGatewayException::class);
});

it('refuses to resolve a registered but unavailable gateway', function () {
    $registry = new GatewayRegistry;
    // No bank details configured — BankTransferGateway::isAvailable() is false.
    $registry->register(new BankTransferGateway([]));
    $resolver = new GatewayResolver($registry);

    expect(fn () => $resolver->resolve('bank_transfer'))
        ->toThrow(UnsupportedGatewayException::class);
});

it('lists only available gateways', function () {
    $registry = new GatewayRegistry;
    $registry->register(new CodGateway);
    $registry->register(new BankTransferGateway([]));
    $resolver = new GatewayResolver($registry);

    $codes = array_map(fn ($gateway) => $gateway->code(), $resolver->availableGateways());

    expect($codes)->toBe(['cod']);
});
