<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerAddress;

function customerToken(Customer $customer): string
{
    return $customer->createToken('test-suite')->plainTextToken;
}

it('updates the caller\'s own profile, including when the email is unchanged', function () {
    $customer = Customer::factory()->create(['email' => 'jane@example.test']);
    $token = customerToken($customer);

    $response = $this->withHeader('Authorization', "Bearer {$token}")->patchJson('/api/v1/customers/me', [
        'name' => 'Jane Updated',
        'email' => 'jane@example.test',
        'expected_version' => $customer->lock_version,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Jane Updated');
});

it('lists, adds, updates, and deletes the caller\'s own addresses', function () {
    $customer = Customer::factory()->create();
    $token = customerToken($customer);
    $headers = ['Authorization' => "Bearer {$token}"];

    $store = $this->withHeaders($headers)->postJson('/api/v1/customers/me/addresses', [
        'recipient_name' => 'Jane Buyer',
        'address_line1' => '1 Main St',
        'city' => 'Dhaka',
        'country_code' => 'BD',
        'expected_version' => $customer->lock_version,
    ]);
    $store->assertCreated();
    $addressId = $store->json('data.id');

    $index = $this->withHeaders($headers)->getJson('/api/v1/customers/me/addresses');
    $index->assertOk()->assertJsonCount(1, 'data');

    $customer->refresh();
    $update = $this->withHeaders($headers)->patchJson("/api/v1/customers/me/addresses/{$addressId}", [
        'city' => 'Chattogram',
        'expected_version' => $customer->lock_version,
    ]);
    $update->assertOk()->assertJsonPath('data.city', 'Chattogram');

    $customer->refresh();
    $destroy = $this->withHeaders($headers)->deleteJson("/api/v1/customers/me/addresses/{$addressId}", [
        'expected_version' => $customer->lock_version,
    ]);
    $destroy->assertStatus(204);

    expect(CustomerAddress::query()->whereKey($addressId)->exists())->toBeFalse();
});

it('never lets a customer edit or delete another customer\'s address — a real ownership check, not just a route shape', function () {
    $owner = Customer::factory()->create();
    $intruder = Customer::factory()->create();
    $intruderToken = customerToken($intruder);

    $address = $owner->addresses()->create([
        'recipient_name' => 'Owner Only', 'address_line1' => '1 Main St', 'city' => 'Dhaka', 'country_code' => 'BD',
    ]);

    $update = $this->withHeader('Authorization', "Bearer {$intruderToken}")->patchJson("/api/v1/customers/me/addresses/{$address->id}", [
        'city' => 'Hijacked',
        'expected_version' => $owner->lock_version,
    ]);
    $update->assertStatus(404);

    $destroy = $this->withHeader('Authorization', "Bearer {$intruderToken}")->deleteJson("/api/v1/customers/me/addresses/{$address->id}", [
        'expected_version' => $owner->lock_version,
    ]);
    $destroy->assertStatus(404);

    expect($address->fresh()->city)->toBe('Dhaka');
});

it('rejects every self-service route with no token at all', function () {
    $this->getJson('/api/v1/customers/me')->assertStatus(401);
    $this->getJson('/api/v1/customers/me/addresses')->assertStatus(401);
    $this->getJson('/api/v1/orders/mine')->assertStatus(401);
});
