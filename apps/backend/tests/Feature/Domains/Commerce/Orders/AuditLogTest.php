<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Models\Order;

it('denies listing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/orders/audit-logs')
        ->assertStatus(403);
});

it('lists audit log entries for a caller with the audit_log.view permission', function () {
    $caller = userWithPermissions(['orders.audit_log.view', 'orders.orders.manage']);
    $order = Order::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/orders/{$order->id}/confirm", ['expected_version' => 1])->assertOk();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders/audit-logs');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBeGreaterThanOrEqual(1);
});
