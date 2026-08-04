<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the promotions module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('promotions');
        expect($definition->key)->toStartWith('promotions.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'promotions.promotions.view',
        'promotions.promotions.manage',
        'promotions.coupons.view',
        'promotions.coupons.manage',
        'promotions.redemptions.view',
        'promotions.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
