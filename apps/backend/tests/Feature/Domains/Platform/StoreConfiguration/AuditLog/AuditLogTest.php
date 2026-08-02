<?php

declare(strict_types=1);

use App\Domains\Platform\StoreConfiguration\Models\Store;

it('denies viewing the audit log without the audit_log.view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/store-configuration/audit-logs')
        ->assertStatus(403);
});

it('lists audited store configuration changes for a caller with the view permission', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage', 'store_configuration.audit_log.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stores', [
        'name' => 'Audited Store',
        'currency_code' => 'USD',
        'locale' => 'en-US',
        'timezone' => 'UTC',
        'contact_email' => 'audited@nexgen-demo.test',
        'address_line1' => '1 Main St',
        'city' => 'Springfield',
        'country_code' => 'US',
    ])->assertCreated();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/store-configuration/audit-logs');

    $response->assertOk();
    expect($response->json('data.*.action'))->toContain('store.created');
});

it('filters the audit log by target_type', function () {
    $caller = userWithPermissions(['store_configuration.audit_log.view', 'store_configuration.stores.manage']);
    $store = Store::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/stores/{$store->id}/archive", [
        'expected_version' => 1,
    ])->assertOk();

    $response = $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/store-configuration/audit-logs?target_type='.urlencode(Store::class));

    expect($response->json('meta.total'))->toBeGreaterThanOrEqual(1);
});
