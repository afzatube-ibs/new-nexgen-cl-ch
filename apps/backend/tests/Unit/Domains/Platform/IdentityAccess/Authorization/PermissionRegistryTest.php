<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the identity_access module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('identity_access');
        expect($definition->key)->toStartWith('identity_access.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach (['identity_access.users.manage', 'identity_access.roles.manage', 'identity_access.user_roles.manage'] as $expected) {
        expect($keys)->toContain($expected);
    }
});
