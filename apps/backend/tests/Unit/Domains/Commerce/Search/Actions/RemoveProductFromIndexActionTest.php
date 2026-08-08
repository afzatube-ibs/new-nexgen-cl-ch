<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Actions\IndexProductAction;
use App\Domains\Commerce\Search\Actions\RemoveProductFromIndexAction;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('removes an indexed product by id', function () {
    $product = Product::factory()->active()->create();
    app(IndexProductAction::class)->execute($product);

    app(RemoveProductFromIndexAction::class)->execute($product->id);

    expect(ProductSearchIndex::query()->where('product_id', $product->id)->exists())->toBeFalse();
});

it('is a no-op when the product was never indexed', function () {
    expect(fn () => app(RemoveProductFromIndexAction::class)->execute((string) Str::uuid()))
        ->not->toThrow(Exception::class);
});
