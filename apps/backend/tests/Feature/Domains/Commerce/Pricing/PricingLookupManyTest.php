<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Models\PriceList;

/**
 * @param  array<int, string>  $skus
 */
function pricingLookupManyUrl(array $skus, string $currencyCode): string
{
    return '/api/v1/pricing/lookup-many?'.http_build_query(['skus' => implode(',', $skus), 'currency_code' => $currencyCode]);
}

it('denies a batch price lookup without the lookup permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson(pricingLookupManyUrl(['SKU-1'], 'USD'))
        ->assertStatus(403);
});

it('resolves the effective price for every real SKU in the default price list, in one call', function () {
    $caller = userWithPermissions(['pricing.lookup.view']);
    $priceList = PriceList::factory()->default()->create(['currency_code' => 'USD']);
    $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '25.0000']);
    $priceList->entries()->create(['sku' => 'SKU-2', 'base_price' => '40.0000', 'sale_price' => '30.0000']);

    $response = $this->actingAs($caller, 'sanctum')->getJson(pricingLookupManyUrl(['sku-1', 'sku-2'], 'usd'));

    $response->assertOk();
    $data = collect($response->json('data'));
    expect($data)->toHaveCount(2);
    expect($data->firstWhere('sku', 'SKU-1'))->toMatchArray(['basePrice' => '25.0000', 'effectivePrice' => '25.0000', 'isSaleActive' => false]);
    expect($data->firstWhere('sku', 'SKU-2'))->toMatchArray(['basePrice' => '40.0000', 'salePrice' => '30.0000', 'effectivePrice' => '30.0000', 'isSaleActive' => true]);
});

it('omits a requested SKU that has no configured price, without fabricating one', function () {
    $caller = userWithPermissions(['pricing.lookup.view']);
    $priceList = PriceList::factory()->default()->create(['currency_code' => 'USD']);
    $priceList->entries()->create(['sku' => 'SKU-1', 'base_price' => '25.0000']);

    $response = $this->actingAs($caller, 'sanctum')->getJson(pricingLookupManyUrl(['SKU-1', 'SKU-UNKNOWN'], 'USD'));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.sku'))->toBe('SKU-1');
});

it('returns an empty list rather than an error when no default price list exists for the currency', function () {
    $caller = userWithPermissions(['pricing.lookup.view']);

    $response = $this->actingAs($caller, 'sanctum')->getJson(pricingLookupManyUrl(['SKU-1'], 'EUR'));

    $response->assertOk();
    expect($response->json('data'))->toBeEmpty();
});

it('ignores a non-default price list even in the same currency', function () {
    $caller = userWithPermissions(['pricing.lookup.view']);
    $nonDefault = PriceList::factory()->create(['currency_code' => 'USD']);
    $nonDefault->entries()->create(['sku' => 'SKU-1', 'base_price' => '25.0000']);

    $response = $this->actingAs($caller, 'sanctum')->getJson(pricingLookupManyUrl(['SKU-1'], 'USD'));

    $response->assertOk();
    expect($response->json('data'))->toBeEmpty();
});

it('validates that skus is required', function () {
    $caller = userWithPermissions(['pricing.lookup.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/pricing/lookup-many?'.http_build_query(['skus' => '', 'currency_code' => 'USD']))
        ->assertStatus(422);
});
