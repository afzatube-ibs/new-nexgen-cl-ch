<?php

declare(strict_types=1);

it('denies viewing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/catalog/audit-logs')
        ->assertStatus(403);
});

it('lists audited catalog changes for a caller with the view permission', function () {
    $caller = userWithPermissions(['catalog.brands.manage', 'catalog.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/brands', ['name' => 'Audited Brand'])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/catalog/audit-logs');

    $response->assertOk();
    expect($response->json('data.*.action'))->toContain('brand.created');
});
