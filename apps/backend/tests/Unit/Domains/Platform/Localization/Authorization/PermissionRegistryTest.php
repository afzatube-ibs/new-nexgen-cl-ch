<?php

declare(strict_types=1);

use App\Domains\Platform\Localization\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the localization module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('localization');
        expect($definition->key)->toStartWith('localization.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'localization.locales.view',
        'localization.locales.manage',
        'localization.currencies.view',
        'localization.currencies.manage',
        'localization.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
