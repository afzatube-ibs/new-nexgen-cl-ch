<?php

declare(strict_types=1);

use Illuminate\Support\Str;

it('denies listing the fulfillment audit log without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/fulfillment/audit-logs')
        ->assertStatus(403);
});

it('lists audit entries produced by shipment mutations', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage', 'fulfillment.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipments', [
        'order_id' => (string) Str::uuid(),
        'order_number' => 'ORD-500001',
        'customer_id' => (string) Str::uuid(),
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/fulfillment/audit-logs');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('action')->all())->toContain('shipment.created');
});
