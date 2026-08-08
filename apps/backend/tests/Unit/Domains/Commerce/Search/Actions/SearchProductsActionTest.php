<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Actions\IndexProductAction;
use App\Domains\Commerce\Search\Actions\SearchProductsAction;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Tests\TestCase;

// See Engines\MySqlFullTextSearchEngineTest's own docblock: InnoDB
// FULLTEXT only searches committed data, so a term-matching test needs
// DatabaseTruncation, not RefreshDatabase's open-transaction isolation.
uses(TestCase::class, DatabaseTruncation::class);

// See Engines\MySqlFullTextSearchEngineTest's own afterEach for why this
// is load-bearing, not defensive: DatabaseTruncation never cleans up
// after itself, only before the next DatabaseTruncation-using test.
afterEach(function () {
    ProductSearchIndex::query()->delete();
    Product::query()->forceDelete();
    Brand::query()->delete();
});

it('never surfaces a draft or not-visible product, regardless of the query', function () {
    $active = Product::factory()->active()->create(['name' => 'Visible Gadget', 'visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    $draft = Product::factory()->create(['name' => 'Draft Gadget', 'status' => Product::STATUS_DRAFT, 'visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    $notVisible = Product::factory()->active()->create(['name' => 'Hidden Gadget', 'visibility' => Product::VISIBILITY_NOT_VISIBLE]);
    $catalogOnly = Product::factory()->active()->create(['name' => 'Catalog Only Gadget', 'visibility' => Product::VISIBILITY_CATALOG]);

    foreach ([$active, $draft, $notVisible, $catalogOnly] as $product) {
        app(IndexProductAction::class)->execute($product);
    }

    $result = app(SearchProductsAction::class)->execute(term: 'gadget');

    expect($result->total)->toBe(1);
    expect($result->items->first()->name)->toBe('Visible Gadget');
});

it('surfaces a product with search-only visibility', function () {
    $product = Product::factory()->active()->create(['name' => 'Search Only Item', 'visibility' => Product::VISIBILITY_SEARCH]);
    app(IndexProductAction::class)->execute($product);

    $result = app(SearchProductsAction::class)->execute(term: 'search only');

    expect($result->total)->toBe(1);
});

it('browses without a term', function () {
    $product = Product::factory()->active()->create(['visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    app(IndexProductAction::class)->execute($product);

    $result = app(SearchProductsAction::class)->execute(term: null);

    expect($result->total)->toBe(1);
});

it('filters by brand_id', function () {
    $brand = Brand::factory()->create();
    $branded = Product::factory()->active()->create(['brand_id' => $brand->id, 'visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    $unbranded = Product::factory()->active()->create(['visibility' => Product::VISIBILITY_CATALOG_SEARCH]);
    app(IndexProductAction::class)->execute($branded);
    app(IndexProductAction::class)->execute($unbranded);

    $result = app(SearchProductsAction::class)->execute(term: null, brandId: $brand->id);

    expect($result->total)->toBe(1);
});
