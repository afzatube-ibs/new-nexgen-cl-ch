<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Attribute;
use App\Domains\Commerce\Catalog\Models\Category;
use App\Domains\Commerce\Catalog\Models\Collection;
use App\Domains\Commerce\Catalog\Models\Option;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductRelationship;
use App\Domains\Commerce\Catalog\Models\Tag;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Support\Str;

it('syncs a product\'s categories, replacing the set entirely', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();
    $categoryA = Category::factory()->create();
    $categoryB = Category::factory()->create();
    $product->categories()->attach($categoryA->id);

    $response = $this->actingAs($caller, 'sanctum')->putJson("/api/v1/products/{$product->id}/categories", [
        'category_ids' => [$categoryB->id],
    ]);

    $response->assertOk();
    expect($product->categories()->pluck('categories.id')->all())->toBe([$categoryB->id]);
});

it('syncs a product\'s collections', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();
    $collection = Collection::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}/collections", ['collection_ids' => [$collection->id]])
        ->assertOk();

    expect($product->collections()->pluck('collections.id')->all())->toBe([$collection->id]);
});

it('syncs a product\'s tags', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();
    $tag = Tag::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}/tags", ['tag_ids' => [$tag->id]])
        ->assertOk();

    expect($product->tags()->pluck('tags.id')->all())->toBe([$tag->id]);
});

it('syncs a product\'s variant-defining options', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->configurable()->create();
    $option = Option::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}/options", ['option_ids' => [$option->id]])
        ->assertOk();

    expect($product->options()->pluck('options.id')->all())->toBe([$option->id]);
});

it('sets a product\'s attribute values', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();
    $attribute = Attribute::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->putJson("/api/v1/products/{$product->id}/attribute-values", [
        'values' => [$attribute->id => 'Cotton'],
        'expected_version' => 1,
    ]);

    $response->assertOk();
    expect($product->attributeValues()->where('attribute_id', $attribute->id)->value('value'))->toBe('Cotton');
});

it('rejects setting a value for an attribute id that does not exist', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}/attribute-values", [
            'values' => [(string) Str::uuid() => 'X'],
            'expected_version' => 1,
        ])
        ->assertStatus(422);
});

it('adds, lists, updates, and removes a product image', function () {
    $caller = userWithPermissions(['catalog.products.manage', 'catalog.products.view']);
    $product = Product::factory()->create();
    $media = MediaAsset::factory()->create();

    $created = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/products/{$product->id}/images", [
        'media_id' => $media->id,
        'is_primary' => true,
    ])->assertCreated();

    $imageId = $created->json('data.id');

    $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/products/{$product->id}/images")
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/products/{$product->id}/images/{$imageId}", ['position' => 5])
        ->assertOk()
        ->assertJsonPath('data.position', 5);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}/images/{$imageId}")
        ->assertStatus(204);
});

it('setting a second image as primary un-sets the first', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();
    $firstMedia = MediaAsset::factory()->create();
    $secondMedia = MediaAsset::factory()->create();
    $first = $product->images()->create(['media_id' => $firstMedia->id, 'is_primary' => true]);

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/products/{$product->id}/images", [
        'media_id' => $secondMedia->id,
        'is_primary' => true,
    ])->assertCreated();

    expect($first->fresh()->is_primary)->toBeFalse();
});

it('adds, lists, and removes a product relationship', function () {
    $caller = userWithPermissions(['catalog.products.manage', 'catalog.products.view']);
    $product = Product::factory()->create();
    $related = Product::factory()->create();

    $created = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/products/{$product->id}/relationships", [
        'related_product_id' => $related->id,
        'type' => 'cross_sell',
    ])->assertCreated();

    $relationshipId = $created->json('data.id');

    $this->actingAs($caller, 'sanctum')
        ->getJson("/api/v1/products/{$product->id}/relationships")
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}/relationships/{$relationshipId}")
        ->assertStatus(204);

    expect(ProductRelationship::query()->find($relationshipId))->toBeNull();
});

it('rejects a product being related to itself', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/relationships", [
            'related_product_id' => $product->id,
            'type' => 'related',
        ])
        ->assertStatus(422);
});
