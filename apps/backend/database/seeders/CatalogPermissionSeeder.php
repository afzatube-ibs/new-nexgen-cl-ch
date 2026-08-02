<?php

namespace Database\Seeders;

use App\Domains\Commerce\Catalog\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Idempotent — safe to run repeatedly. Mirrors Identity & Access's own
 * PermissionSeeder and Store Configuration's StoreConfigurationPermission
 * Seeder — see either's docblock for why this writes into Identity &
 * Access's shared `permissions` table from Database\Seeders rather than
 * from within Catalog's own namespace.
 */
class CatalogPermissionSeeder extends Seeder
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
