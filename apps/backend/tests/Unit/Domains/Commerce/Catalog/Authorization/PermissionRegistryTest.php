<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the catalog module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('catalog');
        expect($definition->key)->toStartWith('catalog.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'catalog.products.manage',
        'catalog.categories.manage',
        'catalog.brands.manage',
        'catalog.attributes.manage',
        'catalog.options.manage',
        'catalog.collections.manage',
        'catalog.tags.manage',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
