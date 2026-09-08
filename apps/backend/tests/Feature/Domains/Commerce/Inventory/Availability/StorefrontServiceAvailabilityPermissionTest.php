<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Models\Role;
use Database\Seeders\InventoryPermissionSeeder;
use Database\Seeders\ServiceAccountRoleSeeder;

it('grants the storefront service only the inventory read permission needed for availability composition', function () {
    $this->seed(InventoryPermissionSeeder::class);
    $this->seed(ServiceAccountRoleSeeder::class);

    $role = Role::query()->where('name', 'storefront-service')->firstOrFail();
    $keys = $role->permissions()->pluck('key')->all();

    expect($keys)->toContain('inventory.stock.view');
    expect($keys)->not->toContain('inventory.stock.manage');
    expect($keys)->not->toContain('inventory.reservations.manage');
    expect($keys)->not->toContain('inventory.transfers.manage');
});
