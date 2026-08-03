<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Audit\AuditLog;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use App\Domains\Commerce\Pricing\Models\TaxZone;

function pricingTaxZonePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'California',
        'country_code' => 'US',
        'region' => 'CA',
    ], $overrides);
}

it('denies listing tax zones without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/tax-zones')
        ->assertStatus(403);
});

it('creates a tax zone given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tax-zones', pricingTaxZonePayload());

    $response->assertCreated()
        ->assertJsonPath('data.countryCode', 'US')
        ->assertJsonPath('data.region', 'CA')
        ->assertJsonPath('data.version', 1);

    expect(TaxZone::query()->where('country_code', 'US')->where('region', 'CA')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'tax_zone.created')->count())->toBe(1);
});

it('defaults region to the empty string for a country-wide zone', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $payload = pricingTaxZonePayload(['name' => 'United States']);
    unset($payload['region']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tax-zones', $payload);

    $response->assertCreated()->assertJsonPath('data.region', '');
});

it('rejects a duplicate (country_code, region) tax zone', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    TaxZone::factory()->create(['country_code' => 'US', 'region' => 'CA']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax-zones', pricingTaxZonePayload())
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('allows a country-wide zone and a region-specific zone for the same country to coexist', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    TaxZone::factory()->create(['country_code' => 'US', 'region' => '']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax-zones', pricingTaxZonePayload())
        ->assertCreated();
});

it('updates a tax zone when the expected version matches', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $zone = TaxZone::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/tax-zones/{$zone->id}", [
        'name' => 'Updated Name',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.version', 2);
});

it('rejects a tax zone update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $zone = TaxZone::factory()->create();
    $zone->update(['name' => 'Already changed once']);

    $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/tax-zones/{$zone->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ])->assertStatus(409);
});

it('archives a tax zone', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $zone = TaxZone::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/tax-zones/{$zone->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a tax zone with no dependent tax rates', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $zone = TaxZone::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/tax-zones/{$zone->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(AuditLog::query()->where('action', 'tax_zone.deleted')->count())->toBe(1);
});

it('refuses to delete a tax zone still referenced by a tax rate', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $zone = TaxZone::factory()->create();
    TaxRate::factory()->create(['tax_zone_id' => $zone->id, 'tax_class_id' => TaxClass::factory()->create()->id]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/tax-zones/{$zone->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
    expect(TaxZone::query()->find($zone->id))->not->toBeNull();
});
