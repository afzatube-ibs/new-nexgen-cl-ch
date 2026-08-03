<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Models\PriceList;

it('denies price lookup without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/pricing/lookup?sku=SKU-1&currency_code=USD')
        ->assertStatus(403);
});

it('resolves the effective price from the default price list in the requested currency', function () {
    $caller = userWithPermissions(['pricing.price_lists.view']);
    $priceList = PriceList::factory()->default()->create(['currency_code' => 'USD']);
    $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '25.00', 'sale_price' => '20.00']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/pricing/lookup?sku=sku-1&currency_code=usd');

    $response->assertOk()
        ->assertJsonPath('data.sku', 'SKU-1')
        ->assertJsonPath('data.effectivePrice', '20.0000');
});

it('ignores a non-default price list even in the same currency', function () {
    $caller = userWithPermissions(['pricing.price_lists.view']);
    $nonDefault = PriceList::factory()->create(['currency_code' => 'USD']);
    $nonDefault->entries()->create(['sku' => 'SKU-1', 'base_price' => '25.00']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/pricing/lookup?sku=SKU-1&currency_code=USD');

    $response->assertOk()->assertJsonPath('data', null);
});

it('returns null data when no entry exists for the sku', function () {
    $caller = userWithPermissions(['pricing.price_lists.view']);
    PriceList::factory()->default()->create(['currency_code' => 'USD']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/pricing/lookup?sku=UNKNOWN&currency_code=USD');

    $response->assertOk()->assertJsonPath('data', null);
});

it('validates the lookup currency code', function () {
    $caller = userWithPermissions(['pricing.price_lists.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/pricing/lookup?sku=SKU-1&currency_code=ZZZ')
        ->assertStatus(422);
});
