<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use App\Domains\Operations\Shipping\Models\ShippingZone;

it('denies listing shipping quote options without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipping/quote-options', ['country_code' => 'BD', 'weight_grams' => 500])
        ->assertStatus(403);
});

it('lists a real quote for every active method that has a matching configured rate', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);

    $standard = ShippingMethod::factory()->create(['name' => 'Standard Delivery']);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $standard->id,
        'min_weight_grams' => 0,
        'max_weight_grams' => null,
        'amount' => '60.0000',
        'currency_code' => 'BDT',
    ]);

    $express = ShippingMethod::factory()->create(['name' => 'Express Delivery']);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $express->id,
        'min_weight_grams' => 0,
        'max_weight_grams' => null,
        'amount' => '150.0000',
        'currency_code' => 'BDT',
    ]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote-options', [
        'country_code' => 'BD',
        'weight_grams' => 500,
    ]);

    $response->assertOk();
    $data = collect($response->json('data'));
    expect($data)->toHaveCount(2);
    expect($data->firstWhere('shippingMethodId', $standard->id))
        ->toMatchArray(['label' => 'Standard Delivery', 'amount' => '60.0000', 'currencyCode' => 'BDT']);
    expect($data->firstWhere('shippingMethodId', $express->id))
        ->toMatchArray(['label' => 'Express Delivery', 'amount' => '150.0000', 'currencyCode' => 'BDT']);
});

it('omits an active method that has no configured rate for the destination, without fabricating one', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);
    $covered = ShippingMethod::factory()->create();
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $covered->id,
        'amount' => '60.0000',
        'currency_code' => 'BDT',
    ]);
    ShippingMethod::factory()->create(); // no rate configured for this method anywhere

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote-options', [
        'country_code' => 'BD',
        'weight_grams' => 500,
    ]);

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.shippingMethodId'))->toBe($covered->id);
});

it('excludes an archived shipping method even if it has a configured rate', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    $zone = ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);
    $archived = ShippingMethod::factory()->archived()->create();
    ShippingRate::factory()->create(['shipping_zone_id' => $zone->id, 'shipping_method_id' => $archived->id]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote-options', [
        'country_code' => 'BD',
        'weight_grams' => 500,
    ]);

    $response->assertOk();
    expect($response->json('data'))->toBeEmpty();
});

it('returns an empty list rather than an error when no method covers the destination at all', function () {
    $caller = userWithPermissions(['shipping.rates.view']);
    ShippingMethod::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping/quote-options', [
        'country_code' => 'FR',
        'weight_grams' => 500,
    ]);

    $response->assertOk();
    expect($response->json('data'))->toBeEmpty();
});
