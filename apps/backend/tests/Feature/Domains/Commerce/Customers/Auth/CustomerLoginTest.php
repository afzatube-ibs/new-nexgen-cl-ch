<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Audit\AuditLog;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\Hash;

it('issues a real token for correct credentials', function () {
    $customer = Customer::factory()->create(['password' => Hash::make('correct-horse-battery-staple')]);

    $response = $this->postJson('/api/v1/customers/login', [
        'email' => $customer->email,
        'password' => 'correct-horse-battery-staple',
        'device_name' => 'test-suite',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.id', $customer->id)
        ->assertJsonStructure(['meta' => ['token']]);
});

it('rejects an unknown email with a generic message, identical to a wrong password', function () {
    // A dedicated, unique placeholder — never `nobody@example.test`, the
    // exact literal RateLimitingTest's own "purpose-built stricter route
    // limiter" test uses against this identical `throttle:login` bucket
    // (keyed by email|ip): reusing it here would make that unrelated
    // test's rate-limit counter start pre-exhausted whenever the full
    // suite (not this file in isolation) runs, a real cross-file
    // test-isolation collision found and fixed live while wiring this
    // milestone's own Customer login onto the same, deliberately shared
    // `login` limiter.
    $unknown = $this->postJson('/api/v1/customers/login', [
        'email' => 'no-such-customer@example.test',
        'password' => 'whatever',
        'device_name' => 'test-suite',
    ]);

    $customer = Customer::factory()->create(['password' => Hash::make('the-real-password')]);
    $wrongPassword = $this->postJson('/api/v1/customers/login', [
        'email' => $customer->email,
        'password' => 'a-wrong-password',
        'device_name' => 'test-suite',
    ]);

    $unknown->assertStatus(422)->assertJsonPath('error.details.email.0', 'The provided credentials are incorrect.');
    $wrongPassword->assertStatus(422)->assertJsonPath('error.details.email.0', 'The provided credentials are incorrect.');
});

it('rejects login for an archived customer account', function () {
    $customer = Customer::factory()->archived()->create(['password' => Hash::make('correct-horse-battery-staple')]);

    $response = $this->postJson('/api/v1/customers/login', [
        'email' => $customer->email,
        'password' => 'correct-horse-battery-staple',
        'device_name' => 'test-suite',
    ]);

    $response->assertStatus(422);
});

it('audits both a successful and a failed customer authentication attempt', function () {
    $customer = Customer::factory()->create(['password' => Hash::make('correct-horse-battery-staple')]);

    $this->postJson('/api/v1/customers/login', ['email' => $customer->email, 'password' => 'correct-horse-battery-staple', 'device_name' => 'test-suite']);
    $this->postJson('/api/v1/customers/login', ['email' => $customer->email, 'password' => 'wrong', 'device_name' => 'test-suite']);

    expect(AuditLog::query()->where('action', 'customer.authenticated')->count())->toBe(1);
    expect(AuditLog::query()->where('action', 'customer.authentication_failed')->count())->toBe(1);
});

it('gets the caller\'s own profile via a real customer token, and logs out revoking only that token', function () {
    $customer = Customer::factory()->create(['password' => Hash::make('correct-horse-battery-staple')]);
    $token = $customer->createToken('test-suite')->plainTextToken;

    $me = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/customers/me');
    $me->assertOk()->assertJsonPath('data.email', $customer->email);

    expect($customer->tokens()->count())->toBe(1);

    $logout = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/customers/logout');
    $logout->assertStatus(204);

    expect($customer->tokens()->count())->toBe(0);
});

it('never lets a staff User\'s own Sanctum token satisfy a customer-guarded route', function () {
    $staff = User::factory()->create();
    $token = $staff->createToken('test-suite')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/customers/me');

    $response->assertStatus(401);
});

it('never lets a customer\'s own Sanctum token satisfy a staff-guarded route', function () {
    $customer = Customer::factory()->create();
    $token = $customer->createToken('test-suite')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/auth/me');

    $response->assertStatus(401);
});
