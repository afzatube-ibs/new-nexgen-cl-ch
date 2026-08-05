<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the fulfillment module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('fulfillment');
        expect($definition->key)->toStartWith('fulfillment.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'fulfillment.shipments.view',
        'fulfillment.shipments.manage',
        'fulfillment.shipments.pick',
        'fulfillment.shipments.pack',
        'fulfillment.shipments.dispatch',
        'fulfillment.shipments.cancel',
        'fulfillment.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
