<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Audit\AuditLog;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\Hash;

it('issues a token for correct credentials', function () {
    $user = User::factory()->create(['password' => Hash::make('correct-horse-battery-staple')]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'correct-horse-battery-staple',
        'device_name' => 'test-suite',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonStructure(['meta' => ['token']]);
});

it('rejects an unknown email with a generic message', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'nobody@nexgen.test',
        'password' => 'whatever',
        'device_name' => 'test-suite',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed')
        ->assertJsonPath('error.details.email.0', 'The provided credentials are incorrect.');
});

it('rejects a correct email with the wrong password, using the identical generic message', function () {
    $user = User::factory()->create(['password' => Hash::make('the-real-password')]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'a-wrong-password',
        'device_name' => 'test-suite',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('error.details.email.0', 'The provided credentials are incorrect.');
});

it('rejects login for an archived account', function () {
    $user = User::factory()->archived()->create(['password' => Hash::make('correct-horse-battery-staple')]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'correct-horse-battery-staple',
        'device_name' => 'test-suite',
    ]);

    $response->assertStatus(422);
});

it('audits both a successful and a failed authentication attempt', function () {
    $user = User::factory()->create(['password' => Hash::make('correct-horse-battery-staple')]);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'correct-horse-battery-staple',
        'device_name' => 'test-suite',
    ]);
    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrong',
        'device_name' => 'test-suite',
    ]);

    expect(AuditLog::query()->where('action', 'user.authenticated')->count())->toBe(1);
    expect(AuditLog::query()->where('action', 'user.authentication_failed')->count())->toBe(1);
});

it('validates required fields', function () {
    $response = $this->postJson('/api/v1/auth/login', []);

    $response->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});
