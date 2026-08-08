<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Actions\IndexProductAction;

it('denies searching without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/search/products?q=anything')
        ->assertStatus(403);
});

it('searches active, search-visible products given the view permission', function () {
    // Uses a short (<4 char, FULLTEXT-unindexable) term so this request
    // exercises Engines\MySqlFullTextSearchEngine's LIKE fallback path —
    // this test class inherits RefreshDatabase from tests/Pest.php's
    // directory-level Feature binding, and InnoDB FULLTEXT's own
    // committed-data-only visibility rule (see Engines\
    // MySqlFullTextSearchEngineTest's own docblock) means a real
    // MATCH ... AGAINST term can't be exercised from inside that open
    // transaction — BOOLEAN MODE relevance matching itself is covered at
    // the Unit level instead (Engines\MySqlFullTextSearchEngineTest,
    // Actions\SearchProductsActionTest), which use DatabaseTruncation.
    $caller = userWithPermissions(['search.products.view']);
    $product = Product::factory()->active()->create(['name' => 'Searchable Widget', 'visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    app(IndexProductAction::class)->execute($product);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/search/products?q=get');

    $response->assertOk()
        ->assertJsonPath('data.0.productId', $product->id)
        ->assertJsonPath('data.0.name', 'Searchable Widget')
        ->assertJsonPath('meta.total', 1);
});

it('never returns a draft or not-visible product, even with a matching term', function () {
    $caller = userWithPermissions(['search.products.view']);
    $draft = Product::factory()->create(['name' => 'Hidden Draft Widget', 'status' => Product::STATUS_DRAFT, 'visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    app(IndexProductAction::class)->execute($draft);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/search/products?q=get');

    $response->assertOk()->assertJsonPath('meta.total', 0);
});

it('browses without a query term', function () {
    $caller = userWithPermissions(['search.products.view']);
    $product = Product::factory()->active()->create(['visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    app(IndexProductAction::class)->execute($product);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/search/products');

    $response->assertOk()->assertJsonPath('meta.total', 1);
});

it('filters by brand_id', function () {
    $caller = userWithPermissions(['search.products.view']);
    $brand = Brand::factory()->create();
    $branded = Product::factory()->active()->create(['brand_id' => $brand->id, 'visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    $unbranded = Product::factory()->active()->create(['visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    app(IndexProductAction::class)->execute($branded);
    app(IndexProductAction::class)->execute($unbranded);

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/search/products?brand_id={$brand->id}");

    $response->assertOk()->assertJsonPath('meta.total', 1);
});

it('paginates results', function () {
    $caller = userWithPermissions(['search.products.view']);
    Product::factory()->active()->count(3)->create(['visibility' => Product::VISIBILITY_CATALOG_SEARCH])
        ->each(fn (Product $product) => app(IndexProductAction::class)->execute($product));

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/search/products?per_page=2&page=1');

    $response->assertOk()
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('meta.per_page', 2)
        ->assertJsonCount(2, 'data');
});

it('rejects a q parameter over 255 characters', function () {
    $caller = userWithPermissions(['search.products.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/search/products?q='.str_repeat('a', 256))
        ->assertStatus(422);
});

it('rejects an invalid sort value', function () {
    $caller = userWithPermissions(['search.products.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/search/products?sort=not_a_real_column')
        ->assertStatus(422);
});
