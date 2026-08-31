<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Models\Customer;

it('registers a real customer account through the public, unauthenticated endpoint', function () {
    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'Jane Buyer',
        'email' => 'jane@example.test',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
        'phone' => '+8801700000000',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Jane Buyer')
        ->assertJsonPath('data.email', 'jane@example.test')
        ->assertJsonPath('data.phone', '+8801700000000')
        ->assertJsonPath('data.phoneVerificationStatus', Customer::PHONE_UNVERIFIED)
        ->assertJsonMissingPath('data.password');

    expect(Customer::query()->where('email', 'jane@example.test')->exists())->toBeTrue();
});

// Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — phone is now the
// required, unique primary identity; email is optional. See
// planning/architecture/PHASE_4_0_BANGLADESH_COMMERCE_ARCHITECTURE.md.
it('registers a real customer account with a phone number and no email at all', function () {
    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'Rahim Uddin',
        'phone' => '+8801912345678',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Rahim Uddin')
        ->assertJsonPath('data.phone', '+8801912345678')
        ->assertJsonPath('data.email', null);

    expect(Customer::query()->where('phone', '+8801912345678')->whereNull('email')->exists())->toBeTrue();
});

it('rejects registration with no phone number at all — phone is now required', function () {
    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'No Phone',
        'email' => 'nophone@example.test',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'validation_failed')->assertJsonStructure(['error' => ['details' => ['phone']]]);
});

it('rejects a duplicate phone number', function () {
    Customer::factory()->create(['phone' => '+8801999999999']);

    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'Someone Else',
        'phone' => '+8801999999999',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'validation_failed')->assertJsonStructure(['error' => ['details' => ['phone']]]);
});

it('rejects a duplicate email', function () {
    Customer::factory()->create(['email' => 'existing@example.test']);

    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'Someone Else',
        'email' => 'existing@example.test',
        'phone' => '+8801700000001',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'validation_failed')->assertJsonStructure(['error' => ['details' => ['email']]]);
});

it('allows two customers to register with no email at all — a nullable column is not a duplicate of itself', function () {
    $first = $this->postJson('/api/v1/customers/register', [
        'name' => 'First No Email',
        'phone' => '+8801700000002',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);
    $second = $this->postJson('/api/v1/customers/register', [
        'name' => 'Second No Email',
        'phone' => '+8801700000003',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);

    $first->assertCreated();
    $second->assertCreated();
});

it('rejects a weak password', function () {
    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'Jane Buyer',
        'email' => 'jane2@example.test',
        'phone' => '+8801700000004',
        'password' => 'weak',
        'password_confirmation' => 'weak',
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'validation_failed')->assertJsonStructure(['error' => ['details' => ['password']]]);
});

it('requires no auth:sanctum token at all — registration is genuinely public', function () {
    // No Sanctum actingAs() anywhere in this test — proves the route
    // itself carries no auth:sanctum middleware.
    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'Anon Buyer',
        'phone' => '+8801700000005',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);

    $response->assertCreated();
});
