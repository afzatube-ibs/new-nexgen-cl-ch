<?php

declare(strict_types=1);

use App\Domains\Commerce\Payments\Gateways\CodGateway;
use App\Domains\Commerce\Payments\Gateways\GatewayRegistry;

it('registers a gateway keyed by its own code', function () {
    $registry = new GatewayRegistry;
    $gateway = new CodGateway;

    $registry->register($gateway);

    expect($registry->has('cod'))->toBeTrue();
    expect($registry->get('cod'))->toBe($gateway);
});

it('reports an unregistered gateway as absent', function () {
    $registry = new GatewayRegistry;

    expect($registry->has('does-not-exist'))->toBeFalse();
    expect($registry->get('does-not-exist'))->toBeNull();
});

it('lists every registered gateway regardless of availability', function () {
    $registry = new GatewayRegistry;
    $registry->register(new CodGateway);

    expect($registry->all())->toHaveKey('cod');
});
