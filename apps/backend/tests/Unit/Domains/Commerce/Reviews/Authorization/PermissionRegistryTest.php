<?php

declare(strict_types=1);

use App\Domains\Commerce\Reviews\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the reviews module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('reviews');
        expect($definition->key)->toStartWith('reviews.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'reviews.reviews.view',
        'reviews.reviews.moderate',
        'reviews.reviews.manage',
        'reviews.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
