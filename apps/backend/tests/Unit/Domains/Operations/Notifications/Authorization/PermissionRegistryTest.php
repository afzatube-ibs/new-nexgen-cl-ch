<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the notifications module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('notifications');
        expect($definition->key)->toStartWith('notifications.');
    }
});

it('declares at least one permission for every resource this module exposes', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    foreach ([
        'notifications.templates.view',
        'notifications.templates.manage',
        'notifications.notifications.view',
        'notifications.notifications.manage',
        'notifications.audit_log.view',
    ] as $expected) {
        expect($keys)->toContain($expected);
    }
});
