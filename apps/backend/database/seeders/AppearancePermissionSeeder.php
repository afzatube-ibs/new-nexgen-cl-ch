<?php

namespace Database\Seeders;

use App\Domains\Platform\Appearance\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Idempotent — mirrors `StoreConfigurationPermissionSeeder` exactly. See
 * that class's docblock for the full rationale.
 */
class AppearancePermissionSeeder extends Seeder
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
