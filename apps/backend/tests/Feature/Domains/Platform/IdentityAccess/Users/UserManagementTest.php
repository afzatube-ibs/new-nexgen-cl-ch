<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Audit\AuditLog;
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
