<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Audit\AuditLog;
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
