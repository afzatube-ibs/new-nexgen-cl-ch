<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Actions\RebuildSearchIndexAction;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('rebuilds the index from Catalog data alone, indexing every non-archived product', function () {
    Product::factory()->active()->count(3)->create();
    Product::factory()->create(); // draft — still indexed (see IndexProductAction's own docblock)
    Product::factory()->archived()->create(); // archived — never indexed

    $indexed = app(RebuildSearchIndexAction::class)->execute();

    expect($indexed)->toBe(4);
    expect(ProductSearchIndex::count())->toBe(4);
});

it('clears stale index rows before rebuilding, converging to exactly current Catalog data', function () {
    $stale = ProductSearchIndex::factory()->create();
    Product::factory()->active()->create();

    app(RebuildSearchIndexAction::class)->execute();

    expect(ProductSearchIndex::query()->where('product_id', $stale->product_id)->exists())->toBeFalse();
    expect(ProductSearchIndex::count())->toBe(1);
});

it('is fully idempotent — running it twice yields the same index', function () {
    Product::factory()->active()->count(2)->create();

    app(RebuildSearchIndexAction::class)->execute();
    $firstCount = ProductSearchIndex::count();

    app(RebuildSearchIndexAction::class)->execute();
    $secondCount = ProductSearchIndex::count();

    expect($firstCount)->toBe($secondCount)->toBe(2);
});
