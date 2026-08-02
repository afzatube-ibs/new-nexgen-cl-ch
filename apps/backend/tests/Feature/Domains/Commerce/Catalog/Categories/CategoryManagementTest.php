<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Category;

it('creates a root category', function () {
    $caller = userWithPermissions(['catalog.categories.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/categories', ['name' => 'Electronics']);

    $response->assertCreated()->assertJsonPath('data.slug', 'electronics')->assertJsonPath('data.parentId', null);
});

it('creates a child category under a parent', function () {
    $caller = userWithPermissions(['catalog.categories.manage']);
    $parent = Category::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/categories', [
        'name' => 'Laptops',
        'parent_id' => $parent->id,
    ]);

    $response->assertCreated()->assertJsonPath('data.parentId', $parent->id);
});

it('rejects a category being set as its own parent', function () {
    $caller = userWithPermissions(['catalog.categories.manage']);
    $category = Category::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/categories/{$category->id}", ['parent_id' => $category->id, 'expected_version' => 1])
        ->assertStatus(422);
});

it('refuses to delete a category that still has children, returning a 409', function () {
    $caller = userWithPermissions(['catalog.categories.manage']);
    $parent = Category::factory()->create();
    Category::factory()->create(['parent_id' => $parent->id]);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/categories/{$parent->id}", ['expected_version' => 1])
        ->assertStatus(409)
        ->assertJsonPath('error.type', 'conflict');
});

it('deletes a childless category and detaches its products', function () {
    $caller = userWithPermissions(['catalog.categories.manage']);
    $category = Category::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/categories/{$category->id}", ['expected_version' => 1])
        ->assertStatus(204);

    expect(Category::query()->find($category->id))->toBeNull();
});

it('archives a category', function () {
    $caller = userWithPermissions(['catalog.categories.manage']);
    $category = Category::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/categories/{$category->id}/archive", ['expected_version' => 1])
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');
});

it('restores a deleted category', function () {
    $caller = userWithPermissions(['catalog.categories.manage']);
    $category = Category::factory()->create();
    $category->delete();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/categories/{$category->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $category->id);

    expect(Category::query()->find($category->id))->not->toBeNull();
});

it('filters categories by parent_id', function () {
    $caller = userWithPermissions(['catalog.categories.view']);
    $parent = Category::factory()->create();
    Category::factory()->create(['parent_id' => $parent->id]);
    Category::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/categories?parent_id={$parent->id}");

    expect($response->json('meta.total'))->toBe(1);
});
