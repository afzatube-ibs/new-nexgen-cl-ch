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
        ->assertJsonMissingPath('data.password');

    expect(Customer::query()->where('email', 'jane@example.test')->exists())->toBeTrue();
});

it('rejects a duplicate email', function () {
    Customer::factory()->create(['email' => 'existing@example.test']);

    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'Someone Else',
        'email' => 'existing@example.test',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'validation_failed')->assertJsonStructure(['error' => ['details' => ['email']]]);
});

it('rejects a weak password', function () {
    $response = $this->postJson('/api/v1/customers/register', [
        'name' => 'Jane Buyer',
        'email' => 'jane2@example.test',
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
        'email' => 'anon@example.test',
        'password' => 'Str0ng!Passw0rd#123',
        'password_confirmation' => 'Str0ng!Passw0rd#123',
    ]);

    $response->assertCreated();
});
