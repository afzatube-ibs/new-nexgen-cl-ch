<?php

declare(strict_types=1);

use App\Domains\Platform\StoreConfiguration\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the store_configuration module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('store_configuration');
        expect($definition->key)->toStartWith('store_configuration.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach (['store_configuration.stores.view', 'store_configuration.stores.manage', 'store_configuration.audit_log.view'] as $expected) {
        expect($keys)->toContain($expected);
    }
});
