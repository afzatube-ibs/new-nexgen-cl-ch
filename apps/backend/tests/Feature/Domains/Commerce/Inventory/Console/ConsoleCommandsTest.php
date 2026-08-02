<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;

it('syncs every registry-declared permission into the database, idempotently', function () {
    $this->artisan('inventory:sync-permissions')->assertSuccessful();

    expect(Permission::query()->where('module', 'inventory')->count())
        ->toBe(count(PermissionRegistry::definitions()));

    $this->artisan('inventory:sync-permissions')->assertSuccessful();

    expect(Permission::query()->where('module', 'inventory')->count())
        ->toBe(count(PermissionRegistry::definitions()));
});
