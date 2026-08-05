<?php

declare(strict_types=1);

use App\Domains\Operations\Shipping\Audit\AuditLog;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use App\Domains\Operations\Shipping\Models\ShippingZone;

function shippingZonePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Dhaka Division',
        'country_code' => 'BD',
        'region' => 'Dhaka',
    ], $overrides);
}

it('denies listing shipping zones without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/shipping-zones')
        ->assertStatus(403);
});

it('creates a shipping zone given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping-zones', shippingZonePayload());

    $response->assertCreated()
        ->assertJsonPath('data.countryCode', 'BD')
        ->assertJsonPath('data.region', 'Dhaka')
        ->assertJsonPath('data.version', 1);

    expect(ShippingZone::query()->where('country_code', 'BD')->where('region', 'Dhaka')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'shipping_zone.created')->count())->toBe(1);
});

it('defaults region to the empty string for a country-wide zone', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);
    $payload = shippingZonePayload(['name' => 'Bangladesh']);
    unset($payload['region']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipping-zones', $payload);

    $response->assertCreated()->assertJsonPath('data.region', '');
});

it('rejects a duplicate (country_code, region) shipping zone', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);
    ShippingZone::factory()->create(['country_code' => 'BD', 'region' => 'Dhaka']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipping-zones', shippingZonePayload())
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('allows a country-wide zone and a region-specific zone for the same country to coexist', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);
    ShippingZone::factory()->create(['country_code' => 'BD', 'region' => '']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipping-zones', shippingZonePayload())
        ->assertCreated();
});

it('updates a shipping zone when the expected version matches', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);
    $zone = ShippingZone::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/shipping-zones/{$zone->id}", [
        'name' => 'Updated Name',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.version', 2);
});

it('rejects a shipping zone update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);
    $zone = ShippingZone::factory()->create();
    $zone->update(['name' => 'Already changed once']);

    $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/shipping-zones/{$zone->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ])->assertStatus(409);
});

it('archives a shipping zone', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);
    $zone = ShippingZone::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/shipping-zones/{$zone->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a shipping zone with no dependent shipping rates', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);
    $zone = ShippingZone::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/shipping-zones/{$zone->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(AuditLog::query()->where('action', 'shipping_zone.deleted')->count())->toBe(1);
});

it('refuses to delete a shipping zone still referenced by a shipping rate', function () {
    $caller = userWithPermissions(['shipping.zones.manage']);
    $zone = ShippingZone::factory()->create();
    ShippingRate::factory()->create(['shipping_zone_id' => $zone->id]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/shipping-zones/{$zone->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
    expect(ShippingZone::query()->find($zone->id))->not->toBeNull();
});
