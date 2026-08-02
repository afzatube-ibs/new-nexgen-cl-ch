<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;

it('syncs every registry-declared permission into the database, idempotently', function () {
    $this->artisan('identity-access:sync-permissions')->assertSuccessful();

    expect(Permission::query()->count())->toBe(count(PermissionRegistry::definitions()));

    // Running it again must not duplicate or fail.
    $this->artisan('identity-access:sync-permissions')->assertSuccessful();

    expect(Permission::query()->count())->toBe(count(PermissionRegistry::definitions()));
});

it('refuses to create an admin before the administrator role exists', function () {
    $this->artisan('identity-access:create-admin', [
        '--name' => 'First Admin',
        '--email' => 'first-admin@nexgen.test',
        '--password' => 'Str0ng!Passw0rd#Boot',
    ])->assertFailed();

    expect(User::query()->where('email', 'first-admin@nexgen.test')->exists())->toBeFalse();
});

it('creates the first administrator with the Administrator role once seeded', function () {
    $this->seed(PermissionSeeder::class);
    $this->seed(RoleSeeder::class);

    $this->artisan('identity-access:create-admin', [
        '--name' => 'First Admin',
        '--email' => 'first-admin@nexgen.test',
        '--password' => 'Str0ng!Passw0rd#Boot',
    ])->assertSuccessful();

    $admin = User::query()->where('email', 'first-admin@nexgen.test')->firstOrFail();
    $role = Role::query()->where('name', 'administrator')->firstOrFail();

    expect($admin->roles()->whereKey($role->id)->exists())->toBeTrue();
    expect($admin->hasPermission('identity_access.users.manage'))->toBeTrue();
});

it('rejects a weak password when bootstrapping the first administrator', function () {
    $this->seed(PermissionSeeder::class);
    $this->seed(RoleSeeder::class);

    $this->artisan('identity-access:create-admin', [
        '--name' => 'First Admin',
        '--email' => 'first-admin@nexgen.test',
        '--password' => 'weak',
    ])->assertFailed();

    expect(User::query()->where('email', 'first-admin@nexgen.test')->exists())->toBeFalse();
});
