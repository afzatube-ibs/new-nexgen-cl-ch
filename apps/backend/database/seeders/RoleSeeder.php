<?php

namespace Database\Seeders;

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Seeds the "Administrator" role bundling every currently-registered
 * permission. A fresh installation has no way to grant its first user any
 * access at all without one role that already grants everything — this is
 * catalog data (a role definition), not a credential, so seeding it by
 * default does not conflict with SECURITY:SECURE_CONFIGURATION the way
 * seeding a default user with a known password would (see Console\
 * Commands\CreateAdminCommand's docblock for that distinction). Depends on
 * PermissionSeeder having already run in the same `db:seed` invocation.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::query()->updateOrCreate(
            ['name' => 'administrator'],
            ['label' => 'Administrator'],
        );

        $role->permissions()->sync(Permission::query()->pluck('id'));
    }
}
