<?php

declare(strict_types=1);

it('denies viewing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/inventory/audit-logs')
        ->assertStatus(403);
});

it('lists audited inventory changes for a caller with the view permission', function () {
    $caller = userWithPermissions(['inventory.warehouses.manage', 'inventory.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/warehouses', [
        'code' => 'audited_wh',
        'name' => 'Audited Warehouse',
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/inventory/audit-logs');

    $response->assertOk();
    expect($response->json('data.*.action'))->toContain('warehouse.created');
});
