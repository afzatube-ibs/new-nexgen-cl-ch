<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the pricing module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('pricing');
        expect($definition->key)->toStartWith('pricing.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'pricing.price_lists.view',
        'pricing.price_lists.manage',
        'pricing.tax.view',
        'pricing.tax.manage',
        'pricing.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
