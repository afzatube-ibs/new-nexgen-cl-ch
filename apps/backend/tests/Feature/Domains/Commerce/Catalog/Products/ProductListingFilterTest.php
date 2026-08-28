<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Collection;
use App\Domains\Commerce\Catalog\Models\Product;

/**
 * neXgen Production Sprint — Milestone 2 completion: real coverage for
 * `GET /products?collection_id=` — the exact same real, additive filter
 * shape `category_id` already has, added so a real Storefront Collection
 * page can finally list its own real member products (see
 * `ProductController::index()`'s own docblock for the full context).
 */
it('denies listing products without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')->getJson('/api/v1/products')->assertStatus(403);
});

it('filters products by collection_id, listing only real members of that collection', function () {
    $caller = userWithPermissions(['catalog.products.view']);
    $collection = Collection::factory()->create();
    $other = Collection::factory()->create();

    $member = Product::factory()->create(['name' => 'Member Product']);
    $member->collections()->sync([$collection->id]);

    $nonMember = Product::factory()->create(['name' => 'Non-Member Product']);
    $nonMember->collections()->sync([$other->id]);

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/products?collection_id={$collection->id}");

    $response->assertOk();
    $names = collect($response->json('data'))->pluck('name');
    expect($names)->toContain('Member Product');
    expect($names)->not->toContain('Non-Member Product');
});

it('returns an empty list, never an error, for a collection with no real member products', function () {
    $caller = userWithPermissions(['catalog.products.view']);
    $collection = Collection::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/products?collection_id={$collection->id}");

    $response->assertOk();
    expect($response->json('data'))->toBeEmpty();
});
