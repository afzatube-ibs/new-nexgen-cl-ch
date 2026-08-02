<?php

namespace Database\Seeders;

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\Media\Authorization\PermissionRegistry;
use Illuminate\Database\Seeder;

class MediaPermissionSeeder extends Seeder
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
