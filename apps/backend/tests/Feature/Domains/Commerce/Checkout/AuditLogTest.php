<?php

declare(strict_types=1);

it('denies listing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/checkout/audit-logs')
        ->assertStatus(403);
});

it('lists audit log entries for a caller with the audit_log.view permission', function () {
    $caller = userWithPermissions(['checkout.audit_log.view', 'checkout.sessions.manage']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/checkout/sessions', [
        'guest_email' => 'audit-test@example.test',
        'guest_name' => 'Audit Test',
        'currency_code' => 'USD',
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/checkout/audit-logs');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBeGreaterThanOrEqual(1);
});
