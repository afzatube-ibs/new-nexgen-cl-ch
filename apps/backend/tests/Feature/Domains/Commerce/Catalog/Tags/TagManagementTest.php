<?php

declare(strict_types=1);

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

it('deletes a tag and detaches its products', function () {
    $caller = userWithPermissions(['catalog.tags.manage']);
    $tag = Tag::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/tags/{$tag->id}", ['expected_version' => 1])
        ->assertStatus(204);
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
