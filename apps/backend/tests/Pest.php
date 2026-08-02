<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature tests boot the full Laravel application (Tests\TestCase) and get
| RefreshDatabase for TESTING:TEST_ISOLATION ("does not depend on state
| left behind by a prior test") — each test runs inside a transaction that
| is rolled back afterward, against the real MySQL TESTING:ENVIRONMENT_
| STRATEGY already established for this project (see phpunit.xml). Unit
| tests, per TESTING:UNIT_TESTING, exercise a single class in isolation and
| do not need either.
|
*/

pest()->extend(TestCase::class)->use(RefreshDatabase::class)->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
*/

expect()->extend('toBeUuid', function () {
    return $this->toMatch('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i');
});

/*
|--------------------------------------------------------------------------
| Identity & Access test helpers
|--------------------------------------------------------------------------
|
| Shared across every Identity & Access feature test rather than each
| reimplementing "create a user with these permissions" — the permissions
| themselves are created ad hoc here (not via PermissionRegistry/
| PermissionSeeder) specifically so these tests remain a check on this
| module's own enforcement logic, not incidentally coupled to exactly
| which permissions the registry happens to declare today.
|
*/

/**
 * Creates a user with a role bundling exactly the given permission keys
 * (creating any that don't already exist) and returns the user.
 *
 * @param  list<string>  $permissionKeys
 */
function userWithPermissions(array $permissionKeys = []): User
{
    $user = User::factory()->create();

    if ($permissionKeys === []) {
        return $user;
    }

    $role = Role::query()->create([
        'name' => 'test-role-'.Str::random(8),
        'label' => 'Test Role',
    ]);

    $permissionIds = collect($permissionKeys)->map(
        fn (string $key) => Permission::query()->firstOrCreate(['key' => $key], [
            'label' => $key,
            'module' => explode('.', $key)[0],
        ])->id
    );

    $role->permissions()->sync($permissionIds);
    $user->roles()->attach($role->id);

    return $user;
}
