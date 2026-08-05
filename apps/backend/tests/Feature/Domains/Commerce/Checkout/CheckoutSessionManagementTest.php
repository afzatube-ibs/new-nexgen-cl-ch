<?php

declare(strict_types=1);

use App\Domains\Commerce\Checkout\Audit\AuditLog;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Support\Str;

it('denies starting a checkout session without the manage permission', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/checkout/sessions', [
            'guest_email' => 'guest@example.test',
            'guest_name' => 'Guest Buyer',
            'currency_code' => 'USD',
        ])
        ->assertStatus(403);
});

it('starts a guest checkout session, auditing it, publishing CheckoutStarted', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/checkout/sessions', [
        'guest_email' => 'guest@example.test',
        'guest_name' => 'Guest Buyer',
        'currency_code' => 'usd',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.guestEmail', 'guest@example.test')
        ->assertJsonPath('data.customerId', null)
        ->assertJsonPath('data.currencyCode', 'USD')
        ->assertJsonPath('data.status', 'open')
        ->assertJsonPath('data.version', 1);

    expect(CheckoutSession::query()->where('guest_email', 'guest@example.test')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'checkout.started')->count())->toBe(1);
});

it('rejects starting a session with both customer_id and guest details', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $customer = Customer::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/checkout/sessions', [
            'customer_id' => $customer->id,
            'guest_email' => 'guest@example.test',
            'guest_name' => 'Guest Buyer',
            'currency_code' => 'USD',
        ])
        ->assertStatus(422);
});

it('rejects starting a session with neither customer_id nor guest details', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/checkout/sessions', ['currency_code' => 'USD'])
        ->assertStatus(422);
});

it('starts a registered-customer session, pre-populating default addresses from the address book', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $customer = Customer::factory()->create();
    $customer->addresses()->create([
        'recipient_name' => 'Default Billing',
        'address_line1' => '1 Billing Way',
        'city' => 'Billtown',
        'country_code' => 'US',
        'is_default_billing' => true,
    ]);
    $customer->addresses()->create([
        'recipient_name' => 'Default Shipping',
        'address_line1' => '1 Shipping Way',
        'city' => 'Shiptown',
        'country_code' => 'US',
        'is_default_shipping' => true,
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/checkout/sessions', [
        'customer_id' => $customer->id,
        'currency_code' => 'USD',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.customerId', $customer->id)
        ->assertJsonPath('data.billingAddress.recipient_name', 'Default Billing')
        ->assertJsonPath('data.shippingAddress.recipient_name', 'Default Shipping');
});

it('starts a registered-customer session with no addresses when none are on file', function () {
    $caller = userWithPermissions(['checkout.sessions.manage']);
    $customer = Customer::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/checkout/sessions', [
        'customer_id' => $customer->id,
        'currency_code' => 'USD',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.billingAddress', null)
        ->assertJsonPath('data.shippingAddress', null);
});

it('shows a checkout session for a caller with the view permission', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);
    $session = CheckoutSession::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/checkout/sessions/{$session->id}");

    $response->assertOk()->assertJsonPath('data.id', $session->id);
});

it('returns 404, not a stack trace, for a nonexistent session', function () {
    $caller = userWithPermissions(['checkout.sessions.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/checkout/sessions/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
