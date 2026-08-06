<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the returns module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('returns');
        expect($definition->key)->toStartWith('returns.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'returns.requests.view',
        'returns.requests.manage',
        'returns.requests.approve',
        'returns.requests.inspect',
        'returns.requests.resolve',
        'returns.requests.cancel',
        'returns.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
