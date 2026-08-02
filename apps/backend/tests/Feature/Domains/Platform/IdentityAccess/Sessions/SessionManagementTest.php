<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Models\User;

it('lets a user list their own sessions without any special permission', function () {
    $user = userWithPermissions([]);
    $token = $user->createToken('device-a');

    $response = $this->withHeader('Authorization', 'Bearer '.$token->plainTextToken)
        ->getJson("/api/v1/users/{$user->id}/sessions");

    $response->assertOk();
    expect($response->json('data.0.isCurrent'))->toBeTrue();
});

it('lets a user revoke their own session without any special permission', function () {
    $user = userWithPermissions([]);
    $token = $user->createToken('device-a');

    $this->withHeader('Authorization', 'Bearer '.$token->plainTextToken)
        ->deleteJson("/api/v1/users/{$user->id}/sessions/{$token->accessToken->id}")
        ->assertStatus(204);

    expect($user->tokens()->count())->toBe(0);
});

it('denies viewing another user\'s sessions without sessions.manage', function () {
    $caller = userWithPermissions([]);
    $other = User::factory()->create();
    $other->createToken('their-device');

    $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/users/{$other->id}/sessions")
        ->assertStatus(403);
});

it('allows an administrator with sessions.manage to revoke another user\'s session', function () {
    $caller = userWithPermissions(['identity_access.sessions.manage']);
    $other = User::factory()->create();
    $theirToken = $other->createToken('their-device');

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/users/{$other->id}/sessions/{$theirToken->accessToken->id}")
        ->assertStatus(204);

    expect($other->tokens()->count())->toBe(0);
});

it('returns 404 for a session id that does not belong to the target user', function () {
    $caller = userWithPermissions(['identity_access.sessions.manage']);
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $tokenForB = $userB->createToken('device');

    // Attempting to revoke B's token while addressing it as A's.
    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/users/{$userA->id}/sessions/{$tokenForB->accessToken->id}")
        ->assertStatus(404);
});
