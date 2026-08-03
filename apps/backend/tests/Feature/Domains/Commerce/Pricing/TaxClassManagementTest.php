<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Audit\AuditLog;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use App\Domains\Commerce\Pricing\Models\TaxZone;

function pricingTaxClassPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Standard',
    ], $overrides);
}

it('denies creating a tax class without the manage permission', function () {
    $caller = userWithPermissions(['pricing.tax.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax-classes', pricingTaxClassPayload())
        ->assertStatus(403);
});

it('creates a tax class given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tax-classes', pricingTaxClassPayload());

    $response->assertCreated()->assertJsonPath('data.name', 'Standard')->assertJsonPath('data.version', 1);
    expect(TaxClass::query()->where('name', 'Standard')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'tax_class.created')->count())->toBe(1);
});

it('rejects a duplicate tax class name', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    TaxClass::factory()->create(['name' => 'Standard']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax-classes', pricingTaxClassPayload())
        ->assertStatus(422);
});

it('updates a tax class when the expected version matches', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $class = TaxClass::factory()->create(['name' => 'Original']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/tax-classes/{$class->id}", [
        'name' => 'Renamed',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Renamed')->assertJsonPath('data.version', 2);
});

it('rejects a tax class update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $class = TaxClass::factory()->create();
    $class->update(['name' => 'Already changed once']);

    $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/tax-classes/{$class->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ])->assertStatus(409);
});

it('archives a tax class', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $class = TaxClass::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/tax-classes/{$class->id}/archive", [
        'expected_version' => 1,
    ])->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a tax class with no dependent tax rates', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $class = TaxClass::factory()->create();

    $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/tax-classes/{$class->id}", [
        'expected_version' => 1,
    ])->assertStatus(204);

    expect(AuditLog::query()->where('action', 'tax_class.deleted')->count())->toBe(1);
});

it('refuses to delete a tax class still referenced by a tax rate', function () {
    $caller = userWithPermissions(['pricing.tax.manage']);
    $class = TaxClass::factory()->create();
    TaxRate::factory()->create(['tax_class_id' => $class->id, 'tax_zone_id' => TaxZone::factory()->create()->id]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/tax-classes/{$class->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
    expect(TaxClass::query()->find($class->id))->not->toBeNull();
});
