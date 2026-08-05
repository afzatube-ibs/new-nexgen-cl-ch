<?php

declare(strict_types=1);

use App\Domains\Commerce\Checkout\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the checkout module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('checkout');
        expect($definition->key)->toStartWith('checkout.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'checkout.sessions.view',
        'checkout.sessions.manage',
        'checkout.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
