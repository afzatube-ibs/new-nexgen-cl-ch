<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Audit\AuditLog;
use App\Domains\Commerce\Customers\Models\Customer;

function validAddressPayload(array $overrides = []): array
{
    return array_merge([
        'label' => 'Home',
        'recipient_name' => 'Jane Shopper',
        'phone' => '+1-202-555-0150',
        'address_line1' => '1 Market Street',
        'address_line2' => 'Suite 400',
        'city' => 'San Francisco',
        'region' => 'CA',
        'postal_code' => '94105',
        'country_code' => 'US',
    ], $overrides);
}

it('denies adding an address without the manage permission', function () {
    $caller = userWithPermissions(['customers.customers.view']);
    $customer = Customer::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/customers/{$customer->id}/addresses", validAddressPayload(['expected_version' => 1]))
        ->assertStatus(403);
});

it('adds an address, bumping the customer aggregate version and auditing it', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/customers/{$customer->id}/addresses", validAddressPayload([
        'expected_version' => 1,
    ]));

    $response->assertCreated()
        ->assertJsonPath('data.recipientName', 'Jane Shopper')
        ->assertJsonPath('data.countryCode', 'US')
        ->assertJsonPath('data.isDefaultShipping', false);

    expect($customer->fresh()->lock_version)->toBe(2);
    expect(AuditLog::query()->where('action', 'customer.address_added')->count())->toBe(1);
});

it('rejects adding an address with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();
    $customer->update(['name' => 'Already changed once']); // now at version 2

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/customers/{$customer->id}/addresses", validAddressPayload([
        'expected_version' => 1,
    ]));

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('rejects a malformed country code', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/customers/{$customer->id}/addresses", validAddressPayload([
            'expected_version' => 1,
            'country_code' => 'USA',
        ]))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('promotes a new address to default shipping, demoting the previous default', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();
    $current = $customer->addresses()->create([
        'recipient_name' => 'Old Default',
        'address_line1' => '1 Old St',
        'city' => 'Springfield',
        'country_code' => 'US',
        'is_default_shipping' => true,
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/customers/{$customer->id}/addresses", validAddressPayload([
        'expected_version' => 1,
        'is_default_shipping' => true,
    ]));

    $response->assertCreated()->assertJsonPath('data.isDefaultShipping', true);
    expect($current->fresh()->is_default_shipping)->toBeFalse();
});

it('keeps default shipping and default billing independent', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/customers/{$customer->id}/addresses", validAddressPayload([
        'expected_version' => 1,
        'is_default_shipping' => true,
        'is_default_billing' => false,
    ]));

    $response->assertCreated()
        ->assertJsonPath('data.isDefaultShipping', true)
        ->assertJsonPath('data.isDefaultBilling', false);
});

it('updates an address, bumping the customer aggregate version', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();
    $address = $customer->addresses()->create([
        'recipient_name' => 'Jane Shopper',
        'address_line1' => '1 Main St',
        'city' => 'Springfield',
        'country_code' => 'US',
    ]);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/customers/{$customer->id}/addresses/{$address->id}", [
        'city' => 'Shelbyville',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.city', 'Shelbyville');
    expect($customer->fresh()->lock_version)->toBe(2);
    expect(AuditLog::query()->where('action', 'customer.address_updated')->count())->toBe(1);
});

it('promotes an existing address to default billing via update, demoting the previous default', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();
    $current = $customer->addresses()->create([
        'recipient_name' => 'Old Billing',
        'address_line1' => '1 Old St',
        'city' => 'Springfield',
        'country_code' => 'US',
        'is_default_billing' => true,
    ]);
    $candidate = $customer->addresses()->create([
        'recipient_name' => 'New Billing',
        'address_line1' => '2 New St',
        'city' => 'Springfield',
        'country_code' => 'US',
    ]);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/customers/{$customer->id}/addresses/{$candidate->id}", [
        'is_default_billing' => true,
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.isDefaultBilling', true);
    expect($current->fresh()->is_default_billing)->toBeFalse();
});

it('deletes an address, bumping the customer aggregate version, with no replacement default forced', function () {
    $caller = userWithPermissions(['customers.customers.manage']);
    $customer = Customer::factory()->create();
    $address = $customer->addresses()->create([
        'recipient_name' => 'Jane Shopper',
        'address_line1' => '1 Main St',
        'city' => 'Springfield',
        'country_code' => 'US',
        'is_default_shipping' => true,
    ]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/customers/{$customer->id}/addresses/{$address->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect($customer->addresses()->count())->toBe(0);
    expect($customer->fresh()->lock_version)->toBe(2);
    expect(AuditLog::query()->where('action', 'customer.address_deleted')->count())->toBe(1);
});
