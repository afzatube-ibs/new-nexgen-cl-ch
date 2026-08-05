<?php

namespace Database\Seeders;

use App\Domains\Commerce\Orders\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Idempotent — safe to run repeatedly. Mirrors every other module's own
 * permission seeder — see any one's docblock for why this writes into
 * Identity & Access's shared `permissions` table from Database\Seeders
 * rather than from within Orders' own namespace.
 */
class OrdersPermissionSeeder extends Seeder
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
