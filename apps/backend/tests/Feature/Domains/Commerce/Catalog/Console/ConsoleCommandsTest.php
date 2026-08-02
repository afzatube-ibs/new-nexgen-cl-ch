<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;

it('syncs every registry-declared permission into the database, idempotently', function () {
    $this->artisan('catalog:sync-permissions')->assertSuccessful();

    expect(Permission::query()->where('module', 'catalog')->count())
        ->toBe(count(PermissionRegistry::definitions()));

    $this->artisan('catalog:sync-permissions')->assertSuccessful();

    expect(Permission::query()->where('module', 'catalog')->count())
        ->toBe(count(PermissionRegistry::definitions()));
});
