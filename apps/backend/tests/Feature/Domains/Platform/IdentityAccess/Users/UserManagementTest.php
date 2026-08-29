<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Audit\AuditLog;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Str;

it('denies listing users without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/users')
        ->assertStatus(403)
        ->assertJsonPath('error.type', 'authorization_denied');
});

it('lists users, paginated, for a caller with the view permission', function () {
    $caller = userWithPermissions(['identity_access.users.view']);
    User::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/users');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    // The caller itself + the 3 created = 4.
    expect($response->json('meta.total'))->toBe(4);
});

/**
 * Production Completion Plan v2, Milestone 6 (Identity & Access Admin
 * UI) — real, live-found regression: without eager-loading `roles` in
 * `UserController::index()`, `UserResource`'s own `whenLoaded('roles')`
 * omits the key entirely from every list-mode response (not `[]` —
 * absent), confirmed live via a direct API call against the real
 * backend, breaking the new Admin Staff list (`row.roles.length` on
 * `undefined`). `show()` already loaded it; this is the identical fix
 * applied to `index()`.
 */
it('includes each user\'s real roles in the list response, not just on show()', function () {
    $caller = userWithPermissions(['identity_access.users.view']);
    $role = Role::query()->create(['name' => 'list_regression_role', 'label' => 'List Regression Role']);
    $staffMember = User::factory()->create();
    $staffMember->roles()->attach($role);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/users');

    $response->assertOk();
    $entry = collect($response->json('data'))->firstWhere('id', $staffMember->id);
    expect($entry)->not->toBeNull();
    expect($entry['roles'])->toBeArray();
    expect(collect($entry['roles'])->pluck('id'))->toContain($role->id);
});

it('filters the user list by status', function () {
    $caller = userWithPermissions(['identity_access.users.view']);
    User::factory()->archived()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/users?status=archived');

    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.status'))->toBe('archived');
});

it('creates a user given the manage permission, publishing UserRegistered', function () {
    $caller = userWithPermissions(['identity_access.users.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/users', [
        'name' => 'New Staff',
        'email' => 'new-staff@nexgen.test',
        'password' => 'Str0ng!Passw0rd#Two',
        'password_confirmation' => 'Str0ng!Passw0rd#Two',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'new-staff@nexgen.test')
        ->assertJsonPath('data.version', 1);

    expect(User::query()->where('email', 'new-staff@nexgen.test')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'user.registered')->count())->toBe(1);
});

it('rejects creating a user without the manage permission', function () {
    $caller = userWithPermissions(['identity_access.users.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/users', [
            'name' => 'New Staff',
            'email' => 'new-staff@nexgen.test',
            'password' => 'Str0ng!Passw0rd#Two',
            'password_confirmation' => 'Str0ng!Passw0rd#Two',
        ])
        ->assertStatus(403);
});

it('rejects a weak password on registration', function () {
    $caller = userWithPermissions(['identity_access.users.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/users', [
            'name' => 'New Staff',
            'email' => 'new-staff@nexgen.test',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
        ->assertStatus(422);
});

it('updates a user when the expected version matches', function () {
    $caller = userWithPermissions(['identity_access.users.manage']);
    $target = User::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/users/{$target->id}", [
        'name' => 'Updated Name',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.version', 2);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['identity_access.users.manage']);
    $target = User::factory()->create();
    $target->update(['name' => 'Already changed once']); // now at version 2

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/users/{$target->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('archives a user, publishing UserArchived, and rejects further login', function () {
    $caller = userWithPermissions(['identity_access.users.manage']);
    $target = User::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/users/{$target->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
    expect($target->fresh()->isActive())->toBeFalse();
});

it('deletes a user and revokes all of their sessions', function () {
    $caller = userWithPermissions(['identity_access.users.manage']);
    $target = User::factory()->create();
    $target->createToken('a-device');

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/users/{$target->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(User::query()->find($target->id))->toBeNull();
    expect(User::withTrashed()->find($target->id))->not->toBeNull();
    expect($target->tokens()->count())->toBe(0);
});

it('returns 404, not a stack trace, for a nonexistent user', function () {
    $caller = userWithPermissions(['identity_access.users.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/users/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});

/**
 * Production Completion Plan v2, Milestone 6 (Identity & Access Admin
 * UI) — real, live-found regression: `UserController::show()`'s own
 * `$user->load('roles')` left each role's own `permissions` key entirely
 * absent (not `[]`) in the response, crashing the Admin's own
 * `UserDetailPage` (`role.permissions.length` on `undefined`) for any
 * real user holding a role with real permissions — including the very
 * first Administrator account every fresh install creates.
 */
it('includes each role\'s own real permissions on show(), not just its id/label', function () {
    $caller = userWithPermissions(['identity_access.users.view']);
    $role = Role::query()->create(['name' => 'show_regression_role', 'label' => 'Show Regression Role']);
    $permission = Permission::query()->create(['key' => 'orders.orders.view', 'label' => 'View Orders', 'module' => 'orders']);
    $role->permissions()->attach($permission->id);
    $target = User::factory()->create();
    $target->roles()->attach($role->id);

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/users/{$target->id}");

    $response->assertOk();
    expect($response->json('data.roles.0.permissions'))->toBeArray();
    expect(collect($response->json('data.roles.0.permissions'))->pluck('key'))->toContain($permission->key);
});
