<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Collection;

it('creates a collection with a generated slug', function () {
    $caller = userWithPermissions(['catalog.collections.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/collections', ['name' => 'Summer Sale']);

    $response->assertCreated()->assertJsonPath('data.slug', 'summer-sale');
});

it('archives a collection', function () {
    $caller = userWithPermissions(['catalog.collections.manage']);
    $collection = Collection::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/collections/{$collection->id}/archive", ['expected_version' => 1])
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');
});

it('deletes a collection and detaches its products', function () {
    $caller = userWithPermissions(['catalog.collections.manage']);
    $collection = Collection::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/collections/{$collection->id}", ['expected_version' => 1])
        ->assertStatus(204);
});

it('restores a deleted collection', function () {
    $caller = userWithPermissions(['catalog.collections.manage']);
    $collection = Collection::factory()->create();
    $collection->delete();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/collections/{$collection->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $collection->id);

    expect(Collection::query()->find($collection->id))->not->toBeNull();
});
