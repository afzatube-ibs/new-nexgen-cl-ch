<?php

declare(strict_types=1);

use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Orders\Models\Order;

it('lists only the caller\'s own orders, never another customer\'s', function () {
    $customer = Customer::factory()->create();
    $otherCustomer = Customer::factory()->create();

    $mine = Order::factory()->create(['customer_id' => $customer->id]);
    Order::factory()->create(['customer_id' => $otherCustomer->id]);

    $token = $customer->createToken('test-suite')->plainTextToken;
    $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/orders/mine');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mine->id);
});

it('shows one of the caller\'s own orders in full', function () {
    $customer = Customer::factory()->create();
    $order = Order::factory()->create(['customer_id' => $customer->id]);
    $token = $customer->createToken('test-suite')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson("/api/v1/orders/mine/{$order->id}");

    $response->assertOk()->assertJsonPath('data.id', $order->id);
});

it('returns 404, not another customer\'s order, when the order id belongs to someone else', function () {
    $customer = Customer::factory()->create();
    $otherCustomer = Customer::factory()->create();
    $othersOrder = Order::factory()->create(['customer_id' => $otherCustomer->id]);
    $token = $customer->createToken('test-suite')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson("/api/v1/orders/mine/{$othersOrder->id}");

    $response->assertStatus(404);
});

it('never lets a staff permission substitute for a real customer token on /orders/mine', function () {
    $staff = userWithPermissions(['orders.orders.view']);

    $response = $this->actingAs($staff, 'sanctum')->getJson('/api/v1/orders/mine');

    $response->assertStatus(401);
});
