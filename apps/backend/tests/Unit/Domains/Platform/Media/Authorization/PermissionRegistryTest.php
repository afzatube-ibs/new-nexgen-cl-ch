<?php

declare(strict_types=1);

use App\Domains\Platform\Media\Authorization\PermissionRegistry;

it('declares every permission with a unique key', function () {
    $keys = array_map(fn ($definition) => $definition->key, PermissionRegistry::definitions());

    expect($keys)->toBe(array_unique($keys));
});

it('declares every permission under the media module', function () {
    foreach (PermissionRegistry::definitions() as $definition) {
        expect($definition->module)->toBe('media');
        expect($definition->key)->toStartWith('media.');
    }
});
