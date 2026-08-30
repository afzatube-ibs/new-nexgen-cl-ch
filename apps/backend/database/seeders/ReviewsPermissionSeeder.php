<?php

namespace Database\Seeders;

use App\Domains\Commerce\Reviews\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Idempotent — safe to run repeatedly. Mirrors every other module's own
 * permission seeder.
 */
class ReviewsPermissionSeeder extends Seeder
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
