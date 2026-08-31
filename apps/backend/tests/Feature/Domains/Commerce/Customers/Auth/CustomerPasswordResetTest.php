<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Audit\AuditLog;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerPasswordResetToken;
use App\Domains\Operations\Notifications\Models\Notification;
use Database\Seeders\NotificationTemplateSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Queue::fake();
    // Every test in this file exercises the real forgot->reset flow, which
    // always attempts to queue a real email — seeded once, here, rather
    // than repeated in every single test.
    $this->seed(NotificationTemplateSeeder::class);
});

it('answers identically whether the email is real or unknown, and only queues a real email for a real one', function () {
    $customer = Customer::factory()->create();

    $real = $this->postJson('/api/v1/customers/password/forgot', ['email' => $customer->email]);
    $unknown = $this->postJson('/api/v1/customers/password/forgot', ['email' => 'nobody-m5b@example.test']);

    $real->assertOk();
    $unknown->assertOk();
    expect($real->json())->toBe($unknown->json());

    expect(CustomerPasswordResetToken::query()->where('email', $customer->email)->exists())->toBeTrue();
    expect(CustomerPasswordResetToken::query()->where('email', 'nobody-m5b@example.test')->exists())->toBeFalse();
    expect(Notification::query()->where('recipient', $customer->email)->count())->toBe(1);
    expect(Notification::query()->where('recipient', 'nobody-m5b@example.test')->count())->toBe(0);
});

it('resets a real password with a real token, and the new password actually works', function () {
    $customer = Customer::factory()->create(['password' => Hash::make('old-password')]);

    $this->postJson('/api/v1/customers/password/forgot', ['email' => $customer->email]);
    $token = capturedResetToken($customer->email);

    $reset = $this->postJson('/api/v1/customers/password/reset', [
        'email' => $customer->email,
        'token' => $token,
        'password' => 'Str0ng!NewPassw0rd#1',
        'password_confirmation' => 'Str0ng!NewPassw0rd#1',
    ]);
    $reset->assertOk();

    $login = $this->postJson('/api/v1/customers/login', [
        'identifier' => $customer->email,
        'password' => 'Str0ng!NewPassw0rd#1',
        'device_name' => 'test-suite',
    ]);
    $login->assertOk();

    expect(CustomerPasswordResetToken::query()->where('email', $customer->email)->exists())->toBeFalse();
});

it('revokes every existing session on a successful reset', function () {
    $customer = Customer::factory()->create(['password' => Hash::make('old-password')]);
    $customer->createToken('pre-existing-session');
    expect($customer->tokens()->count())->toBe(1);

    $this->postJson('/api/v1/customers/password/forgot', ['email' => $customer->email]);
    $token = capturedResetToken($customer->email);

    $this->postJson('/api/v1/customers/password/reset', [
        'email' => $customer->email,
        'token' => $token,
        'password' => 'Str0ng!NewPassw0rd#1',
        'password_confirmation' => 'Str0ng!NewPassw0rd#1',
    ])->assertOk();

    expect($customer->tokens()->count())->toBe(0);
});

it('rejects a wrong token with a generic message, never revealing whether the email is real', function () {
    $customer = Customer::factory()->create();
    $this->postJson('/api/v1/customers/password/forgot', ['email' => $customer->email]);

    $response = $this->postJson('/api/v1/customers/password/reset', [
        'email' => $customer->email,
        'token' => 'a-completely-wrong-token',
        'password' => 'Str0ng!NewPassw0rd#1',
        'password_confirmation' => 'Str0ng!NewPassw0rd#1',
    ]);

    $response->assertStatus(422)->assertJsonPath('error.details.token.0', 'This password reset link is invalid or has expired.');
});

it('rejects an expired token with the identical generic message', function () {
    $customer = Customer::factory()->create();
    CustomerPasswordResetToken::factory()->expired()->create(['email' => $customer->email, 'token' => Hash::make('a-real-token')]);

    $response = $this->postJson('/api/v1/customers/password/reset', [
        'email' => $customer->email,
        'token' => 'a-real-token',
        'password' => 'Str0ng!NewPassw0rd#1',
        'password_confirmation' => 'Str0ng!NewPassw0rd#1',
    ]);

    $response->assertStatus(422)->assertJsonPath('error.details.token.0', 'This password reset link is invalid or has expired.');
});

it('rejects reset for an unknown email with the identical generic message', function () {
    $response = $this->postJson('/api/v1/customers/password/reset', [
        'email' => 'nobody-m5b-2@example.test',
        'token' => 'anything',
        'password' => 'Str0ng!NewPassw0rd#1',
        'password_confirmation' => 'Str0ng!NewPassw0rd#1',
    ]);

    $response->assertStatus(422)->assertJsonPath('error.details.token.0', 'This password reset link is invalid or has expired.');
});

it('audits both a real request and a real completed reset', function () {
    $customer = Customer::factory()->create();
    $this->postJson('/api/v1/customers/password/forgot', ['email' => $customer->email]);
    $token = capturedResetToken($customer->email);

    $this->postJson('/api/v1/customers/password/reset', [
        'email' => $customer->email,
        'token' => $token,
        'password' => 'Str0ng!NewPassw0rd#1',
        'password_confirmation' => 'Str0ng!NewPassw0rd#1',
    ]);

    expect(AuditLog::query()->where('action', 'customer.password_reset_requested')->count())->toBe(1);
    expect(AuditLog::query()->where('action', 'customer.password_was_reset')->count())->toBe(1);
});

it('rejects a request over the dedicated password-reset rate limit', function () {
    $customer = Customer::factory()->create();

    for ($i = 0; $i < 3; $i++) {
        $this->postJson('/api/v1/customers/password/forgot', ['email' => $customer->email])->assertOk();
    }

    $blocked = $this->postJson('/api/v1/customers/password/forgot', ['email' => $customer->email]);
    $blocked->assertStatus(429);
});

/**
 * The real, plaintext token only ever exists in the queued Notification's
 * own rendered body (via {{reset_url}}) — this test helper extracts it
 * from there, exactly as a real customer would read it from a real
 * email, never from a shortcut internal API.
 */
function capturedResetToken(string $email): string
{
    $notification = Notification::query()->where('recipient', $email)->latest()->firstOrFail();
    preg_match('/token=([^&\s]+)/', (string) $notification->body, $matches);

    return urldecode($matches[1] ?? '');
}
