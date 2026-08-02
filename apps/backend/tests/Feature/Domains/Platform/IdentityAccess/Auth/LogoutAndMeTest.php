<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Models\User;

it('requires authentication for /me', function () {
    $this->getJson('/api/v1/auth/me')->assertStatus(401);
});

it('returns the authenticated user with their roles and permissions loaded', function () {
    $user = userWithPermissions(['identity_access.users.view']);

    $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/me');

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.roles.0.permissions.0.key', 'identity_access.users.view');
});

it('logs out by revoking only the current token, leaving other sessions intact', function () {
    $user = User::factory()->create();
    $currentToken = $user->createToken('current-device');
    $otherToken = $user->createToken('other-device');

    $this->withHeader('Authorization', 'Bearer '.$currentToken->plainTextToken)
        ->postJson('/api/v1/auth/logout')
        ->assertStatus(204);

    expect($user->tokens()->whereKey($currentToken->accessToken->id)->exists())->toBeFalse();
    expect($user->tokens()->whereKey($otherToken->accessToken->id)->exists())->toBeTrue();
});
