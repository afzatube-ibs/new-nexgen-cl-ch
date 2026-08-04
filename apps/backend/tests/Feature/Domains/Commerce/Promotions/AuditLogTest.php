<?php

declare(strict_types=1);

it('denies listing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/promotions/audit-logs')
        ->assertStatus(403);
});

it('lists audit log entries for a caller with the audit_log.view permission', function () {
    $caller = userWithPermissions(['promotions.audit_log.view', 'promotions.promotions.manage']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/promotions', [
        'name' => 'Audit Test Promotion',
        'discount_type' => 'percentage',
        'discount_value' => '10.0000',
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/promotions/audit-logs');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBeGreaterThanOrEqual(1);
});
