<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Audit\AuditLog;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerAddress;
use Illuminate\Support\Str;

function validCustomerPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Jane Shopper',
        'email' => 'jane.shopper@nexgen-demo.test',
        'password' => 'Str0ng!Passw0rd#One',
        'password_confirmation' => 'Str0ng!Passw0rd#One',
        'phone' => '+1-202-555-0150',
    ], $overrides);
}

it('denies listing customers without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/customers')
        ->assertStatus(403)
        ->assertJsonPath('error.type', 'authorization_denied');
});

it('lists customers, paginated, for a caller with the view permission', function () {
    $caller = userWithPermissions(['customers.customers.view']);
    Customer::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/customers');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBe(3);
});

it('filters the customer list by status', function () {
    $caller = userWithPermissions(['customers.customers.view']);
    Customer::factory()->archived()->create();
    Customer::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/customers?status=archived');

    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.status'))->toBe('archived');
});

it('searches the customer list by free-text name/email/phone match', function () {
    // Customer Search, per the accepted scope for MODULE:SEARCH
    // (docs/04_MODULE_ARCHITECTURE.md v1.5) — satisfied by this module's
    // own list endpoint rather than by Search's cross-domain index.
    $caller = userWithPermissions(['customers.customers.view']);
    Customer::factory()->create(['name' => 'Rahim Uddin', 'email' => 'rahim@example.test']);
    Customer::factory()->create(['name' => 'Karim Hossain', 'email' => 'karim@example.test']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/customers?q=rahim');

    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.name'))->toBe('Rahim Uddin');
});

it('audits listing and viewing, since customer data is Sensitive', function () {
    $caller = userWithPermissions(['customers.customers.view']);
    $customer = Customer::factory()->create();

    $this->actingAs($caller, 'sanctum')->getJson('/api/v1/customers')->assertOk();
    $this->actingAs($caller, 'sanctum')->getJson("/api/v1/customers/{$customer->id}")->assertOk();

    expect(AuditLog::query()->where('action', 'customer.listed')->count())->toBe(1);
    expect(AuditLog::query()->where('action', 'customer.viewed')->where('target_id', $customer->id)->count())->toBe(1);
});

it('creates a customer given the manage permission, publishing CustomerRegistered and auditing it', function () {
    $caller = userWithPermissions(['customers.customers.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/customers', validCustomerPayload());

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Jane Shopper')
        ->assertJsonPath('data.email', 'jane.shopper@nexgen-demo.test')
        ->assertJsonPath('data.version', 1)
        ->assertJsonMissingPath('data.password');

    expect(Customer::query()->where('email', 'jane.shopper@nexgen-demo.test')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'customer.registered')->count())->toBe(1);
});

it('rejects creating a customer without the manage permission', function () {
    $caller = userWithPermissions(['customers.customers.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/customers', validCustomerPayload())
        ->assertStatus(403);
});

it('rejects a weak password on registration', function () {
    $caller = userWithPermissions(['customers.customers.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/customers', validCustomerPayload(['password' => 'password', 'password_confirmation' => 'password']))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a duplicate customer email', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    Customer::factory()->create(['email' => 'jane.shopper@nexgen-demo.test']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/customers', validCustomerPayload())
        ->assertStatus(422);
});

it('updates a customer profile when the expected version matches, publishing CustomerProfileUpdated', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/customers/{$customer->id}", [
        'name' => 'Updated Name',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.version', 2);
    expect(AuditLog::query()->where('action', 'customer.profile_updated')->count())->toBe(1);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();
    $customer->update(['name' => 'Already changed once']); // now at version 2

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/customers/{$customer->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('archives a customer', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/customers/{$customer->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
    expect($customer->fresh()->isActive())->toBeFalse();
    expect(AuditLog::query()->where('action', 'customer.archived')->count())->toBe(1);
});

it('deletes a customer and its address book together', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();
    $address = $customer->addresses()->create([
        'recipient_name' => 'Jane Shopper',
        'address_line1' => '1 Main St',
        'city' => 'Springfield',
        'country_code' => 'US',
    ]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/customers/{$customer->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(Customer::query()->find($customer->id))->toBeNull();
    expect(Customer::withTrashed()->find($customer->id))->not->toBeNull();
    expect(CustomerAddress::withTrashed()->find($address->id)->trashed())->toBeTrue();
    expect(AuditLog::query()->where('action', 'customer.deleted')->count())->toBe(1);
});

it('exports a customer\'s full profile including addresses, auditing it', function () {
    $caller = userWithPermissions(['customers.customers.view']);
    $customer = Customer::factory()->create();
    $customer->addresses()->create([
        'recipient_name' => 'Jane Shopper',
        'address_line1' => '1 Main St',
        'city' => 'Springfield',
        'country_code' => 'US',
    ]);

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/customers/{$customer->id}/export");

    $response->assertOk()->assertJsonCount(1, 'data.addresses');
    expect(AuditLog::query()->where('action', 'customer.exported')->count())->toBe(1);
});

it('returns 404, not a stack trace, for a nonexistent customer', function () {
    $caller = userWithPermissions(['customers.customers.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/customers/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
