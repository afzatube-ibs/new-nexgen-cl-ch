<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;

it('creates a role with a set of permissions', function () {
    $caller = userWithPermissions(['identity_access.roles.manage']);
    Permission::query()->create(['key' => 'identity_access.widgets.view', 'label' => 'View widgets', 'module' => 'identity_access']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/roles', [
        'name' => 'widget_viewer',
        'label' => 'Widget Viewer',
        'permissions' => ['identity_access.widgets.view'],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'widget_viewer')
        ->assertJsonPath('data.permissions.0.key', 'identity_access.widgets.view');
});

it('rejects a role name that is not unique', function () {
    $caller = userWithPermissions(['identity_access.roles.manage']);
    Role::query()->create(['name' => 'duplicate_name', 'label' => 'First']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/roles', ['name' => 'duplicate_name', 'label' => 'Second'])
        ->assertStatus(422);
});

it('rejects referencing a permission key that does not exist', function () {
    $caller = userWithPermissions(['identity_access.roles.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/roles', ['name' => 'ghost_role', 'label' => 'Ghost', 'permissions' => ['does.not.exist']])
        ->assertStatus(422);
});

it('updates a role\'s permission composition, replacing it entirely', function () {
    $caller = userWithPermissions(['identity_access.roles.manage']);
    $permissionA = Permission::query()->create(['key' => 'identity_access.a', 'label' => 'A', 'module' => 'identity_access']);
    $permissionB = Permission::query()->create(['key' => 'identity_access.b', 'label' => 'B', 'module' => 'identity_access']);
    $role = Role::query()->create(['name' => 'evolving_role', 'label' => 'Evolving']);
    $role->permissions()->attach($permissionA->id);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/roles/{$role->id}", [
        'permissions' => ['identity_access.b'],
        'expected_version' => 1,
    ]);

    $response->assertOk();
    expect($role->fresh()->permissions()->pluck('key')->all())->toBe(['identity_access.b']);
});

it('deletes a role and detaches it from every user holding it', function () {
    $caller = userWithPermissions(['identity_access.roles.manage']);
    $role = Role::query()->create(['name' => 'doomed_role', 'label' => 'Doomed']);
    $holder = userWithPermissions([]);
    $holder->roles()->attach($role->id);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/roles/{$role->id}", ['expected_version' => 1])
        ->assertStatus(204);

    expect(Role::query()->find($role->id))->toBeNull();
    expect($holder->roles()->count())->toBe(0);
});

it('lists the permission catalog for composing a role', function () {
    $caller = userWithPermissions(['identity_access.roles.view']);
    Permission::query()->create(['key' => 'identity_access.z', 'label' => 'Z', 'module' => 'identity_access']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/permissions');

    $response->assertOk();
    expect($response->json('data.*.key'))->toContain('identity_access.z');
});
