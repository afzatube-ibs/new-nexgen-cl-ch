<?php

namespace Database\Seeders;

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\StoreConfiguration\Authorization\PermissionRegistry;
use Illuminate\Database\Seeder;

/**
 * Idempotent — safe to run repeatedly. Equivalent to running
 * `php artisan store-configuration:sync-permissions`; kept as its own
 * seeder so a fresh install's `php artisan db:seed` produces a fully usable
 * permission catalog with no extra manual step, mirroring Identity &
 * Access's own PermissionSeeder.
 *
 * Writes into Identity & Access's `permissions` table (via its Permission
 * model) rather than a table of its own: permissions are a single shared
 * catalog Identity & Access owns, and every module that adds a capability
 * registers its own permissions into that one catalog — exactly the
 * cross-module integration point Identity & Access's own PermissionRegistry
 * docblock anticipates ("a future module... registers it the same way this
 * one is registered"). This seeder lives in Database\Seeders, not inside
 * either module's own namespace, for the same reason PermissionSeeder and
 * RoleSeeder already do: it is project-level composition, not either
 * module's internal implementation.
 */
class StoreConfigurationPermissionSeeder extends Seeder
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
