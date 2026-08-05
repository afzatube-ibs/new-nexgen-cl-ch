<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the shipping module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('shipping');
        expect($definition->key)->toStartWith('shipping.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'shipping.zones.view',
        'shipping.zones.manage',
        'shipping.methods.view',
        'shipping.methods.manage',
        'shipping.rates.view',
        'shipping.rates.manage',
        'shipping.providers.view',
        'shipping.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
