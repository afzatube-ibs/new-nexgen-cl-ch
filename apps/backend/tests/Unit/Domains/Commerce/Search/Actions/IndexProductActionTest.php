<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Models\Category;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Actions\IndexProductAction;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('indexes an active product, denormalizing name, sku, brand, and categories into searchable_text', function () {
    $brand = Brand::factory()->create(['name' => 'Acme']);
    $category = Category::factory()->create(['name' => 'Electronics']);

    $product = Product::factory()->active()->create([
        'name' => 'Smart Watch',
        'sku' => 'SW-100',
        'brand_id' => $brand->id,
        'short_description' => 'A great watch',
    ]);
    $product->categories()->attach($category->id);

    app(IndexProductAction::class)->execute($product);

    $entry = ProductSearchIndex::query()->where('product_id', $product->id)->first();

    expect($entry)->not->toBeNull();
    expect($entry->name)->toBe('Smart Watch');
    expect($entry->sku)->toBe('SW-100');
    expect($entry->brand_id)->toBe($brand->id);
    expect($entry->searchable_text)->toContain('Smart Watch')
        ->toContain('SW-100')
        ->toContain('A great watch')
        ->toContain('Acme')
        ->toContain('Electronics');
});

it('upserts on repeated indexing of the same product', function () {
    $product = Product::factory()->active()->create(['name' => 'Original Name']);

    app(IndexProductAction::class)->execute($product);

    $product->update(['name' => 'Updated Name']);
    app(IndexProductAction::class)->execute($product->fresh());

    expect(ProductSearchIndex::query()->where('product_id', $product->id)->count())->toBe(1);
    expect(ProductSearchIndex::query()->where('product_id', $product->id)->first()->name)->toBe('Updated Name');
});

it('removes rather than indexes an archived product', function () {
    $product = Product::factory()->active()->create();
    app(IndexProductAction::class)->execute($product);
    expect(ProductSearchIndex::query()->where('product_id', $product->id)->exists())->toBeTrue();

    $product->update(['status' => Product::STATUS_ARCHIVED]);
    app(IndexProductAction::class)->execute($product->fresh());

    expect(ProductSearchIndex::query()->where('product_id', $product->id)->exists())->toBeFalse();
});

it('removes rather than indexes a soft-deleted product', function () {
    $product = Product::factory()->active()->create();
    app(IndexProductAction::class)->execute($product);

    $product->delete();
    app(IndexProductAction::class)->execute($product->fresh());

    expect(ProductSearchIndex::query()->where('product_id', $product->id)->exists())->toBeFalse();
});
