<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Models\TaxClass;

it('denies listing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/pricing/audit-logs')
        ->assertStatus(403);
});

it('lists audit log entries for a caller with the audit_log.view permission', function () {
    $caller = userWithPermissions(['pricing.audit_log.view', 'pricing.tax.manage']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tax-classes', ['name' => 'Standard'])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/pricing/audit-logs');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBeGreaterThanOrEqual(1);
});

it('filters the audit log by target_type', function () {
    $caller = userWithPermissions(['pricing.audit_log.view', 'pricing.tax.manage']);
    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tax-classes', ['name' => 'Standard'])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/pricing/audit-logs?target_type='.urlencode(TaxClass::class));

    expect($response->json('meta.total'))->toBe(1);
});
