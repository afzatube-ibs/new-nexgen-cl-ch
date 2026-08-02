<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\Media\Authorization\PermissionRegistry;

it('syncs every registry-declared permission into the database, idempotently', function () {
    $this->artisan('media:sync-permissions')->assertSuccessful();

    expect(Permission::query()->where('module', 'media')->count())
        ->toBe(count(PermissionRegistry::definitions()));

    $this->artisan('media:sync-permissions')->assertSuccessful();

    expect(Permission::query()->where('module', 'media')->count())
        ->toBe(count(PermissionRegistry::definitions()));
});
