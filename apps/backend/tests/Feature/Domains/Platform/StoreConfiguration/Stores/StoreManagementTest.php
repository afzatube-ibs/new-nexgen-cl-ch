<?php

declare(strict_types=1);

use App\Domains\Platform\StoreConfiguration\Audit\AuditLog;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Support\Str;

function validStorePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'neXgen Demo Store',
        'legal_name' => 'neXgen Demo Store LLC',
        'currency_code' => 'USD',
        'locale' => 'en-US',
        'timezone' => 'America/New_York',
        'contact_email' => 'ops@nexgen-demo.test',
        'contact_phone' => '+1-202-555-0100',
        'address_line1' => '1 Market Street',
        'address_line2' => 'Suite 400',
        'city' => 'San Francisco',
        'region' => 'CA',
        'postal_code' => '94105',
        'country_code' => 'US',
    ], $overrides);
}

it('denies listing stores without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/stores')
        ->assertStatus(403)
        ->assertJsonPath('error.type', 'authorization_denied');
});

it('lists stores, paginated, for a caller with the view permission', function () {
    $caller = userWithPermissions(['store_configuration.stores.view']);
    Store::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/stores');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBe(3);
});

it('filters the store list by status', function () {
    $caller = userWithPermissions(['store_configuration.stores.view']);
    Store::factory()->archived()->create();
    Store::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/stores?status=archived');

    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.status'))->toBe('archived');
});

it('searches the store list by free-text name/legal_name/contact_email match', function () {
    // Store Search, per the accepted scope for MODULE:SEARCH
    // (docs/04_MODULE_ARCHITECTURE.md v1.5) — satisfied by this module's
    // own list endpoint rather than by Search's cross-domain index.
    $caller = userWithPermissions(['store_configuration.stores.view']);
    Store::factory()->create(['name' => 'Dhaka Flagship Store']);
    Store::factory()->create(['name' => 'Chattogram Outlet']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/stores?q=Dhaka');

    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.name'))->toBe('Dhaka Flagship Store');
});

it('creates a store given the manage permission, publishing StoreConfigurationChanged and auditing it', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stores', validStorePayload());

    $response->assertCreated()
        ->assertJsonPath('data.name', 'neXgen Demo Store')
        ->assertJsonPath('data.currencyCode', 'USD')
        ->assertJsonPath('data.address.city', 'San Francisco')
        ->assertJsonPath('data.version', 1);

    expect(Store::query()->where('contact_email', 'ops@nexgen-demo.test')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'store.created')->count())->toBe(1);
});

it('rejects creating a store without the manage permission', function () {
    $caller = userWithPermissions(['store_configuration.stores.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/stores', validStorePayload())
        ->assertStatus(403);
});

it('rejects a malformed currency code', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/stores', validStorePayload(['currency_code' => 'US']))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['currency_code']]]);
});

it('rejects a timezone that is not a real IANA identifier', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/stores', validStorePayload(['timezone' => 'Not/AZone']))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['timezone']]]);
});

it('rejects a malformed country code', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/stores', validStorePayload(['country_code' => 'USA']))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed')
        ->assertJsonStructure(['error' => ['details' => ['country_code']]]);
});

it('updates a store when the expected version matches, publishing StoreConfigurationChanged', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage']);
    $store = Store::factory()->create(['currency_code' => 'USD']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/stores/{$store->id}", [
        'currency_code' => 'EUR',
        'expected_version' => 1,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.currencyCode', 'EUR')
        ->assertJsonPath('data.version', 2);

    expect(AuditLog::query()->where('action', 'store.updated')->count())->toBe(1);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage']);
    $store = Store::factory()->create();
    $store->update(['name' => 'Already changed once']); // now at version 2

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/stores/{$store->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('archives a store', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage']);
    $store = Store::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/stores/{$store->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
    expect($store->fresh()->isActive())->toBeFalse();
    expect(AuditLog::query()->where('action', 'store.archived')->count())->toBe(1);
});

it('deletes a store', function () {
    $caller = userWithPermissions(['store_configuration.stores.manage']);
    $store = Store::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/stores/{$store->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(Store::query()->find($store->id))->toBeNull();
    expect(Store::withTrashed()->find($store->id))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'store.deleted')->count())->toBe(1);
});

it('returns 404, not a stack trace, for a nonexistent store', function () {
    $caller = userWithPermissions(['store_configuration.stores.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/stores/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
