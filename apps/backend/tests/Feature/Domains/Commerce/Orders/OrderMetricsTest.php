<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderItem;

/**
 * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) —
 * the real Dashboard's own revenue/order-count/top-products aggregates.
 * See `OrderMetricsController`'s own docblock for why these are a small,
 * additive read endpoint rather than a client-side paginated sum.
 */
it('denies reading order metrics without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/orders/metrics')
        ->assertStatus(403);
});

it('counts pending orders regardless of when they were placed', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    Order::factory()->create(['status' => Order::STATUS_PENDING, 'placed_at' => now()->subMonths(2)]);
    Order::factory()->create(['status' => Order::STATUS_PENDING, 'placed_at' => now()]);
    Order::factory()->create(['status' => Order::STATUS_CONFIRMED, 'placed_at' => now()]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders/metrics');

    $response->assertOk()->assertJsonPath('data.pendingOrders', 2);
});

it('counts orders placed today and this month, regardless of status', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    Order::factory()->create(['status' => Order::STATUS_CANCELLED, 'placed_at' => now()]);
    Order::factory()->create(['status' => Order::STATUS_CONFIRMED, 'placed_at' => now()]);
    Order::factory()->create(['status' => Order::STATUS_CONFIRMED, 'placed_at' => now()->subDays(3)]);
    Order::factory()->create(['status' => Order::STATUS_CONFIRMED, 'placed_at' => now()->subMonths(2)]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders/metrics');

    $response->assertOk()
        ->assertJsonPath('data.ordersToday', 2)
        ->assertJsonPath('data.ordersThisMonth', 3);
});

it('sums revenue per real currency, excluding cancelled orders', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    Order::factory()->create(['status' => Order::STATUS_CONFIRMED, 'placed_at' => now(), 'currency_code' => 'USD', 'grand_total' => '100.0000']);
    Order::factory()->create(['status' => Order::STATUS_DELIVERED, 'placed_at' => now(), 'currency_code' => 'USD', 'grand_total' => '50.0000']);
    Order::factory()->create(['status' => Order::STATUS_CONFIRMED, 'placed_at' => now(), 'currency_code' => 'BDT', 'grand_total' => '2550.0000']);
    // Cancelled — excluded from revenue, even though it happened today.
    Order::factory()->create(['status' => Order::STATUS_CANCELLED, 'placed_at' => now(), 'currency_code' => 'USD', 'grand_total' => '999.0000']);
    // Last month — excluded from today's revenue.
    Order::factory()->create(['status' => Order::STATUS_CONFIRMED, 'placed_at' => now()->subMonths(2), 'currency_code' => 'USD', 'grand_total' => '999.0000']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders/metrics');

    $response->assertOk();
    $revenueToday = collect($response->json('data.revenueToday'))->keyBy('currencyCode');
    expect($revenueToday->get('USD')['amount'])->toBe('150.0000');
    expect($revenueToday->get('BDT')['amount'])->toBe('2550.0000');
});

it('denies reading top products without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/orders/top-products')
        ->assertStatus(403);
});

it('reports the real top-selling products by total quantity, most sold first', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    $orderA = Order::factory()->create();
    $orderB = Order::factory()->create();
    OrderItem::factory()->create(['order_id' => $orderA->id, 'sku' => 'BEST-SELLER', 'product_name' => 'Widget Pro', 'quantity' => 10]);
    OrderItem::factory()->create(['order_id' => $orderB->id, 'sku' => 'BEST-SELLER', 'product_name' => 'Widget Pro', 'quantity' => 5]);
    OrderItem::factory()->create(['order_id' => $orderA->id, 'sku' => 'RUNNER-UP', 'product_name' => 'Widget Basic', 'quantity' => 3]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders/top-products?limit=5');

    $response->assertOk();
    $data = $response->json('data');
    expect($data[0])->toMatchArray(['sku' => 'BEST-SELLER', 'productName' => 'Widget Pro', 'totalQuantity' => 15]);
    expect($data[1])->toMatchArray(['sku' => 'RUNNER-UP', 'productName' => 'Widget Basic', 'totalQuantity' => 3]);
});

it('respects the limit parameter on top products, capped at 20', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    $order = Order::factory()->create();
    foreach (range(1, 3) as $i) {
        OrderItem::factory()->create(['order_id' => $order->id, 'sku' => "SKU-{$i}", 'quantity' => $i]);
    }

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders/top-products?limit=2');

    $response->assertOk()->assertJsonCount(2, 'data');
});
