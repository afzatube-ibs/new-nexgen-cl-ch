<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Audit\AuditLog;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderNote;

it('denies adding a note without the notes manage permission', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    $order = Order::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/notes", ['body' => 'Called customer.', 'expected_version' => 1])
        ->assertStatus(403);
});

it('adds a note, bumping the order version, auditing it', function () {
    $caller = userWithPermissions(['orders.notes.manage']);
    $order = Order::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/orders/{$order->id}/notes", [
        'body' => 'Customer requested gift wrap.',
        'is_customer_visible' => true,
        'expected_version' => 1,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.body', 'Customer requested gift wrap.')
        ->assertJsonPath('data.isCustomerVisible', true);

    expect($order->fresh()->lock_version)->toBe(2);
    expect(OrderNote::query()->where('order_id', $order->id)->count())->toBe(1);
    expect(AuditLog::query()->where('action', 'order.note_added')->count())->toBe(1);
});

it('defaults a note to not customer-visible', function () {
    $caller = userWithPermissions(['orders.notes.manage']);
    $order = Order::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/orders/{$order->id}/notes", [
        'body' => 'Internal note only.',
        'expected_version' => 1,
    ]);

    $response->assertCreated()->assertJsonPath('data.isCustomerVisible', false);
});

it('rejects adding a note with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['orders.notes.manage']);
    $order = Order::factory()->create();
    $order->update(['status' => Order::STATUS_CONFIRMED]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/notes", ['body' => 'Too late.', 'expected_version' => 1])
        ->assertStatus(409);
});
