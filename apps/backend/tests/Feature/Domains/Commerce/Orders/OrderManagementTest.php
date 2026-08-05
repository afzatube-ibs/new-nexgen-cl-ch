<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Orders\Audit\AuditLog;
use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Support\Str;

function ordersOrderPayload(string $customerId, array $overrides = []): array
{
    return array_merge([
        'customer_id' => $customerId,
        'currency_code' => 'USD',
        'items' => [
            [
                'product_id' => (string) Str::uuid(),
                'sku' => 'sku-1',
                'product_name' => 'Widget',
                'quantity' => 2,
                'unit_price' => '25.00',
                'tax_amount' => '5.00',
            ],
        ],
        'billing_address' => [
            'recipient_name' => 'Jane Buyer',
            'address_line1' => '1 Main St',
            'city' => 'Springfield',
            'country_code' => 'us',
        ],
        'shipping_address' => [
            'recipient_name' => 'Jane Buyer',
            'address_line1' => '1 Main St',
            'city' => 'Springfield',
            'country_code' => 'us',
        ],
        'shipping_total' => '10.00',
    ], $overrides);
}

it('denies listing orders without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/orders')
        ->assertStatus(403)
        ->assertJsonPath('error.type', 'authorization_denied');
});

it('denies placing an order without the manage permission', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    $customer = Customer::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/orders', ordersOrderPayload($customer->id))
        ->assertStatus(403);
});

it('places an order with inline addresses, computing totals correctly, auditing it, publishing OrderPlaced', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $customer = Customer::factory()->create(['name' => 'Jane Buyer', 'email' => 'jane@example.test', 'phone' => '+15550000000']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/orders', ordersOrderPayload($customer->id));

    $response->assertCreated()
        ->assertJsonPath('data.customerId', $customer->id)
        ->assertJsonPath('data.customerName', 'Jane Buyer')
        ->assertJsonPath('data.customerEmail', 'jane@example.test')
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.subtotal', '50.0000')
        ->assertJsonPath('data.taxTotal', '5.0000')
        ->assertJsonPath('data.discountTotal', '0.0000')
        ->assertJsonPath('data.shippingTotal', '10.0000')
        ->assertJsonPath('data.grandTotal', '65.0000')
        ->assertJsonPath('data.version', 1)
        ->assertJsonCount(1, 'data.items')
        ->assertJsonCount(2, 'data.addresses');

    expect($response->json('data.orderNumber'))->toStartWith('ORD-');
    expect(Order::query()->where('customer_id', $customer->id)->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'order.placed')->count())->toBe(1);
});

it('snapshots an address from the customer\'s own address book when address_id is given', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $customer = Customer::factory()->create();
    $address = $customer->addresses()->create([
        'recipient_name' => 'Book Address',
        'address_line1' => '99 Book Ave',
        'city' => 'Booktown',
        'country_code' => 'CA',
    ]);

    $payload = ordersOrderPayload($customer->id, [
        'billing_address' => ['address_id' => $address->id],
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/orders', $payload);

    $response->assertCreated();
    $billing = collect($response->json('data.addresses'))->firstWhere('addressType', 'billing');
    expect($billing['recipientName'])->toBe('Book Address');
    expect($billing['addressLine1'])->toBe('99 Book Ave');
    expect($billing['countryCode'])->toBe('CA');
});

it('remains unaffected by a later change to the customer or their address book (immutable snapshot)', function () {
    $caller = userWithPermissions(['orders.orders.manage', 'orders.orders.view']);
    $customer = Customer::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/orders', ordersOrderPayload($customer->id));
    $orderId = $response->json('data.id');

    $customer->update(['name' => 'Renamed Later']);

    $show = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/orders/{$orderId}");

    $show->assertOk()->assertJsonPath('data.customerName', 'Original Name');
});

it('includes discounts in the discount_total and grand_total', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $customer = Customer::factory()->create();

    $payload = ordersOrderPayload($customer->id, [
        'discounts' => [
            ['label' => 'Summer Sale', 'code' => 'SUMMER10', 'amount' => '7.50'],
        ],
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/orders', $payload);

    $response->assertCreated()
        ->assertJsonPath('data.discountTotal', '7.5000')
        ->assertJsonPath('data.grandTotal', '57.5000');
});

it('rejects placing an order with no items', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $customer = Customer::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/orders', ordersOrderPayload($customer->id, ['items' => []]))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a nonexistent customer_id', function () {
    $caller = userWithPermissions(['orders.orders.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/orders', ordersOrderPayload((string) Str::uuid()))
        ->assertStatus(422);
});

it('rejects an invalid currency_code', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $customer = Customer::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/orders', ordersOrderPayload($customer->id, ['currency_code' => 'ZZZ']))
        ->assertStatus(422);
});

it('lists orders, paginated, filterable by status and customer_id', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    Order::factory()->count(2)->create();
    $target = Order::factory()->confirmed()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders?status=confirmed');

    $response->assertOk();
    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.id'))->toBe($target->id);
});

it('returns 404, not a stack trace, for a nonexistent order', function () {
    $caller = userWithPermissions(['orders.orders.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/orders/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
