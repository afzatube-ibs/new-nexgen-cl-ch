<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Audit\AuditLog;
use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use Illuminate\Support\Str;

function pricingPriceListPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Standard Retail',
        'currency_code' => 'USD',
    ], $overrides);
}

it('denies listing price lists without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/price-lists')
        ->assertStatus(403)
        ->assertJsonPath('error.type', 'authorization_denied');
});

it('lists price lists, paginated, for a caller with the view permission', function () {
    $caller = userWithPermissions(['pricing.price_lists.view']);
    PriceList::factory()->count(3)->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/price-lists');

    $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    expect($response->json('meta.total'))->toBe(3);
});

it('creates a price list given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/price-lists', pricingPriceListPayload());

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Standard Retail')
        ->assertJsonPath('data.currencyCode', 'USD')
        ->assertJsonPath('data.isDefault', false)
        ->assertJsonPath('data.version', 1);

    expect(PriceList::query()->where('name', 'Standard Retail')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'price_list.created')->count())->toBe(1);
});

it('rejects creating a price list without the manage permission', function () {
    $caller = userWithPermissions(['pricing.price_lists.view']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/price-lists', pricingPriceListPayload())
        ->assertStatus(403);
});

it('rejects a price list with an invalid currency code', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/price-lists', pricingPriceListPayload(['currency_code' => 'ZZZ']))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('updates a price list when the expected version matches', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/price-lists/{$priceList->id}", [
        'name' => 'Updated Name',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.version', 2);
    expect(AuditLog::query()->where('action', 'price_list.updated')->count())->toBe(1);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();
    $priceList->update(['name' => 'Already changed once']); // now at version 2

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/price-lists/{$priceList->id}", [
        'name' => 'Racing update',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('promotes a price list to default and clears the previous default in the same currency', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $currentDefault = PriceList::factory()->default()->create(['currency_code' => 'USD']);
    $candidate = PriceList::factory()->create(['currency_code' => 'USD']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/price-lists/{$candidate->id}", [
        'is_default' => true,
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.isDefault', true);
    expect($currentDefault->fresh()->is_default)->toBeFalse();
});

it('does not clear the default of a price list in a different currency', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $eurDefault = PriceList::factory()->default()->create(['currency_code' => 'EUR']);
    $usdCandidate = PriceList::factory()->create(['currency_code' => 'USD']);

    $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/price-lists/{$usdCandidate->id}", [
        'is_default' => true,
        'expected_version' => 1,
    ])->assertOk();

    expect($eurDefault->fresh()->is_default)->toBeTrue();
});

it('blocks changing currency once a price list has priced entries', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create(['currency_code' => 'USD']);
    $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '10.00']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/price-lists/{$priceList->id}", [
        'currency_code' => 'EUR',
        'expected_version' => 1,
    ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('allows changing currency when a price list has no entries', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create(['currency_code' => 'USD']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/price-lists/{$priceList->id}", [
        'currency_code' => 'EUR',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.currencyCode', 'EUR');
});

it('archives a price list', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/price-lists/{$priceList->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
    expect($priceList->fresh()->isActive())->toBeFalse();
    expect(AuditLog::query()->where('action', 'price_list.archived')->count())->toBe(1);
});

it('deletes a price list and its entries together', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();
    $entry = $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '10.00']);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/price-lists/{$priceList->id}", [
        'expected_version' => 1,
    ]);

    $response->assertStatus(204);
    expect(PriceList::query()->find($priceList->id))->toBeNull();
    expect(PriceListEntry::withTrashed()->find($entry->id)->trashed())->toBeTrue();
    expect(AuditLog::query()->where('action', 'price_list.deleted')->count())->toBe(1);
});

it('returns 404, not a stack trace, for a nonexistent price list', function () {
    $caller = userWithPermissions(['pricing.price_lists.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/price-lists/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
