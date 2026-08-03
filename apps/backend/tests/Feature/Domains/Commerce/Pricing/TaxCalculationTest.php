<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Models\TaxClass;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Support\Str;

it('denies tax calculation without the view permission', function () {
    $caller = userWithPermissions([]);
    $class = TaxClass::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax/calculate', [
            'tax_class_id' => $class->id,
            'country_code' => 'US',
            'amount' => '100.00',
        ])
        ->assertStatus(403);
});

it('calculates tax using the matching zone and rate', function () {
    $caller = userWithPermissions(['pricing.tax.view']);
    $class = TaxClass::factory()->create();
    $zone = TaxZone::factory()->create(['country_code' => 'US', 'region' => 'CA']);
    TaxRate::factory()->create(['tax_zone_id' => $zone->id, 'tax_class_id' => $class->id, 'rate' => '8.5000']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tax/calculate', [
        'tax_class_id' => $class->id,
        'country_code' => 'US',
        'region' => 'CA',
        'amount' => '100.00',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.rate', '8.5000')
        ->assertJsonPath('data.taxAmount', '8.5000')
        ->assertJsonPath('data.totalAmount', '108.5000')
        ->assertJsonPath('data.taxZoneId', $zone->id);
});

it('resolves zero tax as a valid outcome when no zone or rate matches', function () {
    $caller = userWithPermissions(['pricing.tax.view']);
    $class = TaxClass::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tax/calculate', [
        'tax_class_id' => $class->id,
        'country_code' => 'ZZ',
        'amount' => '100.00',
    ]);

    $response->assertOk()->assertJsonPath('data.rate', '0.0000')->assertJsonPath('data.taxZoneId', null);
});

it('rejects a nonexistent tax_class_id', function () {
    $caller = userWithPermissions(['pricing.tax.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/tax/calculate', [
            'tax_class_id' => (string) Str::uuid(),
            'country_code' => 'US',
            'amount' => '100.00',
        ])
        ->assertStatus(422);
});
