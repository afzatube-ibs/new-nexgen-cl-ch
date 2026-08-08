<?php

declare(strict_types=1);

use App\Domains\Commerce\Search\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the search module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('search');
        expect($definition->key)->toStartWith('search.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'search.products.view',
        'search.index.manage',
        'search.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
