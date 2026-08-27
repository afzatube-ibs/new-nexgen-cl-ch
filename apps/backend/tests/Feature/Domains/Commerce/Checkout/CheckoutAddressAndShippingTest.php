<?php

declare(strict_types=1);

use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Customers\Models\Customer;

function checkoutInlineAddressPayload(array $overrides = []): array
{
    return array_merge([
        'recipient_name' => 'Jane Buyer',
        'address_line1' => '1 Main St',
        'city' => 'Springfield',
        'country_code' => 'us',
        'expected_version' => 1,
    ], $overrides);
}

it('denies setting an address without the manage permission', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);
    $session = CheckoutSession::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->putJson("/api/v1/checkout/sessions/{$session->id}/billing-address", checkoutInlineAddressPayload())
        ->assertStatus(403);
});

it('sets an inline billing address, normalizing the country code to uppercase', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->putJson(
        "/api/v1/checkout/sessions/{$session->id}/billing-address",
        checkoutInlineAddressPayload()
    );

    $response->assertOk()
        ->assertJsonPath('data.billingAddress.recipient_name', 'Jane Buyer')
        ->assertJsonPath('data.billingAddress.country_code', 'US');
});

it('sets a shipping address resolved from the customer\'s own address book', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $customer = Customer::factory()->create();
    $address = $customer->addresses()->create([
        'recipient_name' => 'Book Address',
        'address_line1' => '99 Book Ave',
        'city' => 'Booktown',
        'country_code' => 'CA',
    ]);
    $session = CheckoutSession::factory()->forCustomer($customer->id)->create();

    $response = $this->actingAs($caller, 'sanctum')->putJson(
        "/api/v1/checkout/sessions/{$session->id}/shipping-address",
        ['address_id' => $address->id, 'expected_version' => 1]
    );

    $response->assertOk()
        ->assertJsonPath('data.shippingAddress.recipient_name', 'Book Address')
        ->assertJsonPath('data.shippingAddress.country_code', 'CA');
});

it('rejects referencing another customer\'s address', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $customer = Customer::factory()->create();
    $otherCustomer = Customer::factory()->create();
    $otherAddress = $otherCustomer->addresses()->create([
        'recipient_name' => 'Not Yours',
        'address_line1' => '1 Nope St',
        'city' => 'Nopeville',
        'country_code' => 'US',
    ]);
    $session = CheckoutSession::factory()->forCustomer($customer->id)->create();

    $this->actingAs($caller, 'sanctum')
        ->putJson("/api/v1/checkout/sessions/{$session->id}/shipping-address", [
            'address_id' => $otherAddress->id,
            'expected_version' => 1,
        ])
        ->assertStatus(404);
});

it('selects a shipping option resolved elsewhere, storing its id, label, and amount as given', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create(['currency_code' => 'BDT']);

    $response = $this->actingAs($caller, 'sanctum')->putJson(
        "/api/v1/checkout/sessions/{$session->id}/shipping-option",
        [
            'shipping_method_id' => '01a00770-c4f9-730b-8988-b831a1eddce6',
            'shipping_label' => 'Standard Delivery',
            'shipping_amount' => '60.0000',
            'currency_code' => 'BDT',
            'expected_version' => 1,
        ]
    );

    $response->assertOk()
        ->assertJsonPath('data.shippingOptionId', '01a00770-c4f9-730b-8988-b831a1eddce6')
        ->assertJsonPath('data.shippingOptionLabel', 'Standard Delivery')
        ->assertJsonPath('data.shippingTotal', '60.0000');
});

it('rejects a shipping quote whose currency does not match the session', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create(['currency_code' => 'BDT']);

    $this->actingAs($caller, 'sanctum')
        ->putJson("/api/v1/checkout/sessions/{$session->id}/shipping-option", [
            'shipping_method_id' => '01a00770-c4f9-730b-8988-b831a1eddce6',
            'shipping_label' => 'Standard Delivery',
            'shipping_amount' => '60.0000',
            'currency_code' => 'USD',
            'expected_version' => 1,
        ])
        ->assertStatus(422);
});

it('rejects an incomplete shipping selection', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $session = CheckoutSession::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->putJson("/api/v1/checkout/sessions/{$session->id}/shipping-option", [
            'expected_version' => 1,
        ])
        ->assertStatus(422);
});
