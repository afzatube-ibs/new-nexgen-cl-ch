<?php

namespace Database\Seeders;

use App\Domains\Commerce\Inventory\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Database\Seeder;

class InventoryPermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PermissionRegistry::definitions() as $definition) {
            Permission::query()->updateOrCreate(
                ['key' => $definition->key],
                ['label' => $definition->label, 'module' => $definition->module],
            );
        }
    }
}
