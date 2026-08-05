<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the orders module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('orders');
        expect($definition->key)->toStartWith('orders.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'orders.orders.view',
        'orders.orders.manage',
        'orders.notes.manage',
        'orders.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
