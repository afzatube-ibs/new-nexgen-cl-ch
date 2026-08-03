<?php

declare(strict_types=1);

use App\Domains\Platform\Localization\Models\Currency;

it('denies viewing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/localization/audit-logs')
        ->assertStatus(403);
});

it('lists audited localization changes for a caller with the view permission', function () {
    $caller = userWithPermissions(['localization.locales.manage', 'localization.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/locales', [
        'code' => 'fr',
        'name' => 'French',
        'native_name' => 'Français',
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/localization/audit-logs');

    $response->assertOk();
    expect($response->json('data.*.action'))->toContain('locale.added');
});

it('filters the audit log by target_type', function () {
    $caller = userWithPermissions(['localization.currencies.manage', 'localization.audit_log.view']);
    $currency = Currency::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/currencies/{$currency->id}/archive", [
        'expected_version' => 1,
    ])->assertOk();

    $response = $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/localization/audit-logs?target_type='.urlencode(Currency::class));

    expect($response->json('meta.total'))->toBeGreaterThanOrEqual(1);
});
