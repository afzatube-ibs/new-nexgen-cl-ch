<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Audit\AuditLog;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use App\Domains\Commerce\Pricing\Models\TaxZone;

function pricingTaxRatePayload(array $overrides = []): array
{
    if (! array_key_exists('tax_zone_id', $overrides)) {
        $overrides['tax_zone_id'] = TaxZone::factory()->create()->id;
    }

    if (! array_key_exists('tax_class_id', $overrides)) {
        $overrides['tax_class_id'] = TaxClass::factory()->create()->id;
    }

    return array_merge(['rate' => '8.5000'], $overrides);
}

it('denies creating a tax rate without the manage permission', function () {
    $caller = userWithPermissions(['pricing.tax.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax-rates', pricingTaxRatePayload())
        ->assertStatus(403);
});

it('creates a tax rate given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $zone = TaxZone::factory()->create();
    $class = TaxClass::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tax-rates', pricingTaxRatePayload([
        'tax_zone_id' => $zone->id,
        'tax_class_id' => $class->id,
    ]));

    $response->assertCreated()
        ->assertJsonPath('data.taxZoneId', $zone->id)
        ->assertJsonPath('data.taxClassId', $class->id)
        ->assertJsonPath('data.version', 1);

    expect(TaxRate::query()->where('tax_zone_id', $zone->id)->where('tax_class_id', $class->id)->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'tax_rate.created')->count())->toBe(1);
});

it('rejects a rate outside the 0-100 range', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax-rates', pricingTaxRatePayload(['rate' => '150']))
        ->assertStatus(422);
});

it('rejects a duplicate (tax_zone_id, tax_class_id) tax rate', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $zone = TaxZone::factory()->create();
    $class = TaxClass::factory()->create();
    TaxRate::factory()->create(['tax_zone_id' => $zone->id, 'tax_class_id' => $class->id]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax-rates', pricingTaxRatePayload(['tax_zone_id' => $zone->id, 'tax_class_id' => $class->id]))
        ->assertStatus(422);
});

it('updates a tax rate when the expected version matches', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $rate = TaxRate::factory()->create(['rate' => '5.0000']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/tax-rates/{$rate->id}", [
        'rate' => '7.2500',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.rate', '7.2500')->assertJsonPath('data.version', 2);
});

it('rejects a tax rate update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $rate = TaxRate::factory()->create();
    $rate->update(['rate' => '9.9900']);

    $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/tax-rates/{$rate->id}", [
        'rate' => '1.0000',
        'expected_version' => 1,
    ])->assertStatus(409);
});

it('archives a tax rate', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $rate = TaxRate::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/tax-rates/{$rate->id}/archive", [
        'expected_version' => 1,
    ])->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a tax rate', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $rate = TaxRate::factory()->create();

    $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/tax-rates/{$rate->id}", [
        'expected_version' => 1,
    ])->assertStatus(204);

    expect(TaxRate::query()->find($rate->id))->toBeNull();
    expect(AuditLog::query()->where('action', 'tax_rate.deleted')->count())->toBe(1);
});
