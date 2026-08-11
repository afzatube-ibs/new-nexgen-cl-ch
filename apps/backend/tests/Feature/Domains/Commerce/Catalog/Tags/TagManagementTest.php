<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\Tag;

it('creates a tag with a generated slug', function () {
    $caller = userWithPermissions(['catalog.tags.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tags', ['name' => 'Bestseller']);

    $response->assertCreated()->assertJsonPath('data.slug', 'bestseller');
});

it('rejects creating a tag without the manage permission', function () {
    $caller = userWithPermissions(['catalog.tags.view']);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/tags', ['name' => 'Bestseller'])->assertStatus(403);
});

it('deletes an unassigned tag', function () {
    $caller = userWithPermissions(['catalog.tags.manage']);
    $tag = Tag::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/tags/{$tag->id}", ['expected_version' => 1])
        ->assertStatus(204);
});

it('refuses to delete a tag still assigned to a product, returning a 409', function () {
    $caller = userWithPermissions(['catalog.tags.manage']);
    $tag = Tag::factory()->create();
    $product = Product::factory()->create();
    $tag->products()->attach($product->id);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/tags/{$tag->id}", ['expected_version' => 1])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');

    expect(Tag::query()->find($tag->id))->not->toBeNull();
});

it('restores a deleted tag', function () {
    $caller = userWithPermissions(['catalog.tags.manage']);
    $tag = Tag::factory()->create();
    $tag->delete();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/tags/{$tag->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $tag->id);

    expect(Tag::query()->find($tag->id))->not->toBeNull();
});
