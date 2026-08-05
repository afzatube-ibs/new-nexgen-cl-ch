<?php

namespace Database\Seeders;

use App\Domains\Operations\Fulfillment\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Idempotent — safe to run repeatedly. Mirrors every other module's own
 * permission seeder.
 */
class FulfillmentPermissionSeeder extends Seeder
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
