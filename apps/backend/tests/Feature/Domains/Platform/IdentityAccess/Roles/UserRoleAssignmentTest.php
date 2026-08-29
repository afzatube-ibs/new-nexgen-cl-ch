<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Audit\AuditLog;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;

it('assigns a role to a user given the manage permission', function () {
    $caller = userWithPermissions(['identity_access.user_roles.manage']);
    $target = userWithPermissions([]);
    $role = Role::query()->create(['name' => 'a_role', 'label' => 'A Role']);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/users/{$target->id}/roles", [
        'role_id' => $role->id,
    ]);

    $response->assertOk()->assertJsonPath('data.roles.0.id', $role->id);
    expect(AuditLog::query()->where('action', 'role.assigned')->count())->toBe(1);
});

/**
 * Production Completion Plan v2, Milestone 6 (Identity & Access Admin
 * UI) — real, live-found regression: `UserRoleController::store()`'s own
 * `$user->load('roles')` left each role's own `permissions` key entirely
 * absent (not `[]`) in the response, crashing the Admin's own
 * `UserDetailPage` (`role.permissions.length` on `undefined`) the moment
 * a real role — carrying real permissions — was assigned through the UI.
 */
it('includes the newly-assigned role\'s own real permissions in the response, not just its id', function () {
    $caller = userWithPermissions(['identity_access.user_roles.manage']);
    $target = userWithPermissions([]);
    $role = Role::query()->create(['name' => 'a_role_with_perms', 'label' => 'A Role With Perms']);
    $permission = Permission::query()->create(['key' => 'orders.orders.view', 'label' => 'View Orders', 'module' => 'orders']);
    $role->permissions()->attach($permission->id);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/users/{$target->id}/roles", ['role_id' => $role->id]);

    $response->assertOk();
    expect($response->json('data.roles.0.permissions'))->toBeArray();
    expect(collect($response->json('data.roles.0.permissions'))->pluck('key'))->toContain($permission->key);
});

it('is idempotent when assigning a role the user already holds', function () {
    $caller = userWithPermissions(['identity_access.user_roles.manage']);
    $target = userWithPermissions([]);
    $role = Role::query()->create(['name' => 'a_role', 'label' => 'A Role']);
    $target->roles()->attach($role->id);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/users/{$target->id}/roles", ['role_id' => $role->id])
        ->assertOk();

    expect($target->roles()->count())->toBe(1);
});

it('revokes a role from a user, publishing RoleRevoked', function () {
    $caller = userWithPermissions(['identity_access.user_roles.manage']);
    $target = userWithPermissions([]);
    $role = Role::query()->create(['name' => 'a_role', 'label' => 'A Role']);
    $target->roles()->attach($role->id);

    $response = $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/users/{$target->id}/roles/{$role->id}");

    $response->assertStatus(204);
    expect($target->roles()->count())->toBe(0);
    expect(AuditLog::query()->where('action', 'role.revoked')->count())->toBe(1);
});

it('denies assigning a role without the user_roles.manage permission', function () {
    $caller = userWithPermissions(['identity_access.users.manage']); // a related, but distinct, permission
    $target = userWithPermissions([]);
    $role = Role::query()->create(['name' => 'a_role', 'label' => 'A Role']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/users/{$target->id}/roles", ['role_id' => $role->id])
        ->assertStatus(403);
});
