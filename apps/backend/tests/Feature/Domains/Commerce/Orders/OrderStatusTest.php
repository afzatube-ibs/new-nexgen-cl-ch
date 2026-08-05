<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Audit\AuditLog;
use App\Domains\Commerce\Orders\Models\Order;

it('denies confirming an order without the manage permission', function () {
    $caller = userWithPermissions(['orders.orders.view']);
    $order = Order::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/confirm", ['expected_version' => 1])
        ->assertStatus(403);
});

it('walks an order through its full happy-path lifecycle', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $order = Order::factory()->create();

    $r1 = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/orders/{$order->id}/confirm", ['expected_version' => 1]);
    $r1->assertOk()->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.version', 2);

    $r2 = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/orders/{$order->id}/start-processing", ['expected_version' => 2]);
    $r2->assertOk()->assertJsonPath('data.status', 'processing')->assertJsonPath('data.version', 3);

    $r3 = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/orders/{$order->id}/ship", ['expected_version' => 3]);
    $r3->assertOk()->assertJsonPath('data.status', 'shipped')->assertJsonPath('data.version', 4);

    $r4 = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/orders/{$order->id}/deliver", ['expected_version' => 4]);
    $r4->assertOk()->assertJsonPath('data.status', 'delivered')->assertJsonPath('data.version', 5);

    expect(AuditLog::query()->where('target_id', $order->id)->count())->toBe(4);
});

it('rejects shipping an order that was never confirmed', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $order = Order::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/ship", ['expected_version' => 1])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a status transition with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $order = Order::factory()->create();
    $order->update(['status' => Order::STATUS_CONFIRMED]); // now at version 2

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/confirm", ['expected_version' => 1])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');
});

it('cancels an order with a reason, recording it on the timeline', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $order = Order::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/orders/{$order->id}/cancel", [
        'reason' => 'Customer changed their mind',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'cancelled');
    expect(AuditLog::query()->where('action', 'order.cancelled')->count())->toBe(1);
});

it('rejects cancelling a delivered order', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $order = Order::factory()->delivered()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/cancel", ['reason' => 'too late', 'expected_version' => 1])
        ->assertStatus(422);
});

it('rejects transitioning a cancelled order further', function () {
    $caller = userWithPermissions(['orders.orders.manage']);
    $order = Order::factory()->cancelled()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/confirm", ['expected_version' => 1])
        ->assertStatus(422);
});
