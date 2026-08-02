<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\StoreConfiguration\Authorization\PermissionRegistry;

it('syncs every registry-declared permission into the database, idempotently', function () {
    $this->artisan('store-configuration:sync-permissions')->assertSuccessful();

    expect(Permission::query()->where('module', 'store_configuration')->count())
        ->toBe(count(PermissionRegistry::definitions()));

    // Running it again must not duplicate or fail.
    $this->artisan('store-configuration:sync-permissions')->assertSuccessful();

    expect(Permission::query()->where('module', 'store_configuration')->count())
        ->toBe(count(PermissionRegistry::definitions()));
});
