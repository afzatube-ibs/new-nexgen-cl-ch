<?php

namespace Database\Seeders;

use App\Domains\Platform\IdentityAccess\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Idempotent — safe to run repeatedly. Equivalent to running
 * `php artisan identity-access:sync-permissions`; kept as its own seeder
 * (rather than only a console command) so a fresh install's
 * `php artisan db:seed` produces a fully usable permission catalog with no
 * extra manual step.
 */
class PermissionSeeder extends Seeder
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
