<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Events\ProductArchived;
use App\Domains\Commerce\Catalog\Events\ProductCreated;
use App\Domains\Commerce\Catalog\Events\ProductUpdated;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

// Each test here exercises one of Search's own Listeners\* classes on the
// real, application-wired event bus — mirroring tests/Unit/Listeners/
// NotificationListenersTest.php's own "publish on the real bus, not the
// listener class in isolation" approach. Unlike that test, these
// listeners are registered from this module's own Providers\
// SearchServiceProvider::boot(), not App\Providers\AppServiceProvider —
// see that provider's own docblock.
uses(TestCase::class, RefreshDatabase::class);

it('reindexes a product when ProductCreated is published', function () {
    $product = Product::factory()->active()->create(['name' => 'Listener Created Product']);

    app(DomainEventBus::class)->publish(new ProductCreated(
        productId: $product->id,
        sku: $product->sku,
        status: $product->status,
    ));

    $entry = ProductSearchIndex::query()->where('product_id', $product->id)->first();
    expect($entry)->not->toBeNull();
    expect($entry->name)->toBe('Listener Created Product');
});

it('reindexes a product when ProductUpdated is published', function () {
    $product = Product::factory()->active()->create(['name' => 'Original']);
    app(DomainEventBus::class)->publish(new ProductCreated($product->id, $product->sku, $product->status));

    $product->update(['name' => 'Renamed']);

    app(DomainEventBus::class)->publish(new ProductUpdated(
        productId: $product->id,
        sku: $product->sku,
        status: $product->status,
    ));

    $entry = ProductSearchIndex::query()->where('product_id', $product->id)->first();
    expect($entry->name)->toBe('Renamed');
});

it('removes a product from the index when ProductArchived is published', function () {
    $product = Product::factory()->active()->create();
    app(DomainEventBus::class)->publish(new ProductCreated($product->id, $product->sku, $product->status));
    expect(ProductSearchIndex::query()->where('product_id', $product->id)->exists())->toBeTrue();

    app(DomainEventBus::class)->publish(new ProductArchived(
        productId: $product->id,
        sku: $product->sku,
    ));

    expect(ProductSearchIndex::query()->where('product_id', $product->id)->exists())->toBeFalse();
});

it('is a no-op when the referenced product no longer exists', function () {
    app(DomainEventBus::class)->publish(new ProductCreated(
        productId: (string) Str::uuid(),
        sku: 'GHOST-SKU',
        status: Product::STATUS_ACTIVE,
    ));

    expect(ProductSearchIndex::count())->toBe(0);
});

it('never lets a reindex failure break the triggering ProductCreated workflow', function () {
    // Simulates a broken index write (config('search.default_engine')
    // pointed at an unregistered engine) the same way Notifications' own
    // regression test does for a missing template — proves the try/catch
    // in every Search\Listeners\* class actually isolates a reindex
    // failure from Catalog's own workflow, per this module's own v1.5
    // docblock and Notifications' own established precedent.
    config(['search.default_engine' => 'not_registered']);

    $product = Product::factory()->active()->create();

    expect(fn () => app(DomainEventBus::class)->publish(new ProductCreated(
        productId: $product->id,
        sku: $product->sku,
        status: $product->status,
    )))->not->toThrow(Exception::class);
});
