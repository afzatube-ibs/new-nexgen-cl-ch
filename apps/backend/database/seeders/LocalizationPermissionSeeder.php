<?php

namespace Database\Seeders;

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\Localization\Authorization\PermissionRegistry;
use Illuminate\Database\Seeder;

/**
 * Idempotent — safe to run repeatedly. Equivalent to running
 * `php artisan localization:sync-permissions`; kept as its own seeder so a
 * fresh install's `php artisan db:seed` produces a fully usable permission
 * catalog with no extra manual step, mirroring Store Configuration's own
 * StoreConfigurationPermissionSeeder.
 *
 * Writes into Identity & Access's `permissions` table (via its Permission
 * model) rather than a table of its own — see
 * StoreConfigurationPermissionSeeder's docblock for the full rationale.
 */
class LocalizationPermissionSeeder extends Seeder
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
