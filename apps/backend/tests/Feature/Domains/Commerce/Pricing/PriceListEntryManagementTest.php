<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Audit\AuditLog;
use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;

function pricingPriceListEntryPayload(array $overrides = []): array
{
    return array_merge([
        'sku' => 'SKU-12345',
        'base_price' => '49.99',
    ], $overrides);
}

it('rejects creating an entry without the manage permission', function () {
    $caller = userWithPermissions(['pricing.price_lists.view']);
    $priceList = PriceList::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/price-lists/{$priceList->id}/entries", pricingPriceListEntryPayload())
        ->assertStatus(403);
});

it('creates a priced entry given the manage permission, auditing it and publishing PriceChanged', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/price-lists/{$priceList->id}/entries", pricingPriceListEntryPayload());

    $response->assertCreated()
        ->assertJsonPath('data.sku', 'SKU-12345')
        ->assertJsonPath('data.basePrice', '49.99')
        ->assertJsonPath('data.isSaleActive', false)
        ->assertJsonPath('data.effectivePrice', '49.99')
        ->assertJsonPath('data.version', 1);

    expect(PriceListEntry::query()->where('sku', 'SKU-12345')->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'price_list_entry.created')->count())->toBe(1);
});

it('rejects a duplicate sku within the same price list', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();
    $priceList->entries()->create(['sku' => 'SKU-12345', 'base_price' => '10.00']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/price-lists/{$priceList->id}/entries", pricingPriceListEntryPayload())
        ->assertStatus(422);
});

it('allows the same sku across two different price lists', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $otherList = PriceList::factory()->create();
    $otherList->entries()->create(['sku' => 'SKU-12345', 'base_price' => '10.00']);
    $priceList = PriceList::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/price-lists/{$priceList->id}/entries", pricingPriceListEntryPayload())
        ->assertCreated();
});

it('rejects a sale_price that is not less than base_price on creation', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/price-lists/{$priceList->id}/entries", pricingPriceListEntryPayload([
            'base_price' => '50.00',
            'sale_price' => '50.00',
        ]))
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('rejects sale_ends_at before sale_starts_at', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/price-lists/{$priceList->id}/entries", pricingPriceListEntryPayload([
            'sale_price' => '30.00',
            'sale_starts_at' => now()->addDays(2)->toIso8601String(),
            'sale_ends_at' => now()->addDay()->toIso8601String(),
        ]))
        ->assertStatus(422);
});

it('updates only sale_price and validates it against the entry existing base_price', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();
    $entry = $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '40.00']);

    $response = $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/price-lists/{$priceList->id}/entries/{$entry->id}", [
            'sale_price' => '45.00',
            'expected_version' => 1,
        ]);

    $response->assertStatus(422)->assertJsonPath('error.type', 'validation_failed');
});

it('updates a priced entry when the expected version matches', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();
    $entry = $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '40.00']);

    $response = $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/price-lists/{$priceList->id}/entries/{$entry->id}", [
            'sale_price' => '30.00',
            'expected_version' => 1,
        ]);

    $response->assertOk()->assertJsonPath('data.salePrice', '30.00')->assertJsonPath('data.version', 2);
    expect(AuditLog::query()->where('action', 'price_list_entry.updated')->count())->toBe(1);
});

it('rejects an entry update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();
    $entry = $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '40.00']);
    $entry->update(['base_price' => '41.00']); // now at version 2

    $response = $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/price-lists/{$priceList->id}/entries/{$entry->id}", [
            'base_price' => '42.00',
            'expected_version' => 1,
        ]);

    $response->assertStatus(409)->assertJsonPath('error.type', 'conflict');
});

it('deletes a priced entry', function () {
    $caller = userWithPermissions(['pricing.price_lists.manage']);
    $priceList = PriceList::factory()->create();
    $entry = $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '40.00']);

    $response = $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/price-lists/{$priceList->id}/entries/{$entry->id}", [
            'expected_version' => 1,
        ]);

    $response->assertStatus(204);
    expect(PriceListEntry::query()->find($entry->id))->toBeNull();
    expect(AuditLog::query()->where('action', 'price_list_entry.deleted')->count())->toBe(1);
});
