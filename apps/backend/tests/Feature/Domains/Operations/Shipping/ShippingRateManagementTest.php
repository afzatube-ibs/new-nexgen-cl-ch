<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Audit\AuditLog;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use App\Domains\Operations\Shipping\Models\ShippingZone;

/**
 * Builds defaults lazily (only creating a ShippingZone/ShippingMethod
 * fixture when the caller has not already supplied one) — PHP evaluates
 * an array literal's values eagerly regardless of whether array_merge()
 * later discards them for an override, so a naive
 * `array_merge(['shipping_zone_id' => ShippingZone::factory()->create()->id, ...], $overrides)`
 * would create a throwaway zone on every call even when $overrides
 * already names one, risking an unrelated (tenant_id, country_code,
 * region) unique-constraint collision against a zone the test created
 * explicitly.
 */
function shippingRatePayload(array $overrides = []): array
{
    $defaults = [
        'amount' => '60.0000',
        'currency_code' => 'BDT',
    ];

    if (! array_key_exists('shipping_zone_id', $overrides)) {
        $defaults['shipping_zone_id'] = ShippingZone::factory()->create()->id;
    }

    if (! array_key_exists('shipping_method_id', $overrides)) {
        $defaults['shipping_method_id'] = ShippingMethod::factory()->create()->id;
    }

    return array_merge($defaults, $overrides);
}

it('denies listing shipping rates without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/shipping-rates')
        ->assertStatus(403);
});

it('creates a shipping rate given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping-rates', shippingRatePayload());

    $response->assertCreated()
        ->assertJsonPath('data.amount', '60.0000')
        ->assertJsonPath('data.currencyCode', 'BDT')
        ->assertJsonPath('data.minWeightGrams', 0)
        ->assertJsonPath('data.version', 1);

    expect(ShippingRate::query()->where('amount', '60.0000')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'shipping_rate.created')->count())->toBe(1);
});

it('rejects an invalid currency code', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipping-rates', shippingRatePayload(['currency_code' => 'XXX']))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects a max_weight_grams not greater than min_weight_grams', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipping-rates', shippingRatePayload(['min_weight_grams' => 2000, 'max_weight_grams' => 1000]))
        ->assertStatus(422);
});

it('allows two weight-banded rates for the same zone and method to coexist', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);
    $zone = ShippingZone::factory()->create();
    $method = ShippingMethod::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping-rates', shippingRatePayload([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $method->id,
        'min_weight_grams' => 0,
        'max_weight_grams' => 2000,
        'amount' => '60.0000',
    ]))->assertCreated();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping-rates', shippingRatePayload([
        'shipping_zone_id' => $zone->id,
        'shipping_method_id' => $method->id,
        'min_weight_grams' => 2000,
        'amount' => '110.0000',
    ]))->assertCreated();

    expect(ShippingRate::query()->where('shipping_zone_id', $zone->id)->where('shipping_method_id', $method->id)->count())->toBe(2);
});

it('rejects a duplicate (zone, method, min_weight) shipping rate', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);
    $zone = ShippingZone::factory()->create();
    $method = ShippingMethod::factory()->create();
    ShippingRate::factory()->create(['shipping_zone_id' => $zone->id, 'shipping_method_id' => $method->id, 'min_weight_grams' => 0]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipping-rates', shippingRatePayload([
            'shipping_zone_id' => $zone->id,
            'shipping_method_id' => $method->id,
            'min_weight_grams' => 0,
        ]))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');

    expect(ShippingRate::query()->where('shipping_zone_id', $zone->id)->where('shipping_method_id', $method->id)->count())->toBe(1);
});

it('updates a shipping rate when the expected version matches', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);
    $rate = ShippingRate::factory()->create(['amount' => '60.0000']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/shipping-rates/{$rate->id}", [
        'amount' => '75.0000',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.amount', '75.0000')->assertJsonPath('data.version', 2);
});

it('rejects a shipping rate update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);
    $rate = ShippingRate::factory()->create();
    $rate->update(['amount' => '99.0000']);

    $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/shipping-rates/{$rate->id}", [
        'amount' => '10.0000',
        'expected_version' => 1,
    ])->assertStatus(409);
});

it('archives a shipping rate', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);
    $rate = ShippingRate::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/shipping-rates/{$rate->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a shipping rate', function () {
    $caller = userWithPermissions(['shipping.rates.manage']);
    $rate = ShippingRate::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/shipping-rates/{$rate->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(AuditLog::query()->where('action', 'shipping_rate.deleted')->count())->toBe(1);
});
