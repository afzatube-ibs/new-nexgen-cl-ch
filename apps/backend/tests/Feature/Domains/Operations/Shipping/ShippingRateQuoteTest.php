<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use App\Domains\Operations\Shipping\Models\ShippingZone;

it('denies quoting a shipping rate without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipping/quote', [
            'shipping_method_id' => ShippingMethod::factory()->create()->id,
            'country_code' => 'BD',
            'weight_grams' => 500,
        ])
        ->assertStatus(403);
});

it('quotes the matching configured rate for a region-specific zone', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    $method = ShippingMethod::factory()->create();
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => 'Dhaka']);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $method->id,
        'min_weight_grams' => 0,
        'max_weight_grams' => 2000,
        'amount' => '60.0000',
        'currency_code' => 'BDT',
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote', [
        'shipping_method_id' => $method->id,
        'country_code' => 'BD',
        'region' => 'Dhaka',
        'weight_grams' => 500,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.amount', '60.0000')
        ->assertJsonPath('data.currencyCode', 'BDT')
        ->assertJsonPath('data.shippingZoneId', $zone->id);
});

it('falls back to the country-wide zone when no region-specific zone matches', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    $method = ShippingMethod::factory()->create();
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $method->id,
        'amount' => '80.0000',
        'currency_code' => 'BDT',
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote', [
        'shipping_method_id' => $method->id,
        'country_code' => 'BD',
        'region' => 'Chattogram',
        'weight_grams' => 500,
    ]);

    $response->assertOk()->assertJsonPath('data.amount', '80.0000');
});

it('selects the correct weight band when multiple rates exist for the same zone and method', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    $method = ShippingMethod::factory()->create();
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $method->id,
        'min_weight_grams' => 0,
        'max_weight_grams' => 2000,
        'amount' => '60.0000',
    ]);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $method->id,
        'min_weight_grams' => 2000,
        'max_weight_grams' => null,
        'amount' => '110.0000',
    ]);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote', [
        'shipping_method_id' => $method->id,
        'country_code' => 'BD',
        'weight_grams' => 1500,
    ])->assertOk()->assertJsonPath('data.amount', '60.0000');

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote', [
        'shipping_method_id' => $method->id,
        'country_code' => 'BD',
        'weight_grams' => 5000,
    ])->assertOk()->assertJsonPath('data.amount', '110.0000');
});

it('returns 404 rather than a fabricated zero when no rate is configured', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    $method = ShippingMethod::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote', [
        'shipping_method_id' => $method->id,
        'country_code' => 'US',
        'weight_grams' => 500,
    ])->assertStatus(404);
});

it('returns 404 for an archived shipping method', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    $method = ShippingMethod::factory()->archived()->create();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote', [
        'shipping_method_id' => $method->id,
        'country_code' => 'BD',
        'weight_grams' => 500,
    ])->assertStatus(404);
});
