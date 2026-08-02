<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Option;
use App\Domains\Commerce\Catalog\Models\Product;

it('creates an option', function () {
    $caller = userWithPermissions(['catalog.options.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/options', ['code' => 'color', 'name' => 'Color']);

    $response->assertCreated()->assertJsonPath('data.code', 'color');
});

it('adds a value to an option, generating a slug', function () {
    $caller = userWithPermissions(['catalog.options.manage']);
    $option = Option::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/options/{$option->id}/values", [
        'value' => 'Red',
        'expected_option_version' => 1,
    ]);

    $response->assertCreated()->assertJsonPath('data.value', 'Red')->assertJsonPath('data.slug', 'red');
});

it('rejects adding a value with a stale option version', function () {
    $caller = userWithPermissions(['catalog.options.manage']);
    $option = Option::factory()->create();
    $option->update(['name' => 'Renamed']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/options/{$option->id}/values", ['value' => 'Red', 'expected_option_version' => 1])
        ->assertStatus(409);
});

it('updates an option value', function () {
    $caller = userWithPermissions(['catalog.options.manage']);
    $option = Option::factory()->create();
    $value = $option->values()->create(['value' => 'Red', 'slug' => 'red']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/options/{$option->id}/values/{$value->id}", [
        'value' => 'Crimson',
        'expected_option_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.value', 'Crimson');
});

it('removes an option value that is not used by any variant', function () {
    $caller = userWithPermissions(['catalog.options.manage']);
    $option = Option::factory()->create();
    $value = $option->values()->create(['value' => 'Red', 'slug' => 'red']);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/options/{$option->id}/values/{$value->id}", ['expected_option_version' => 1])
        ->assertStatus(204);
});

it('restores a deleted option', function () {
    $caller = userWithPermissions(['catalog.options.manage']);
    $option = Option::factory()->create();
    $option->delete();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/options/{$option->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $option->id);

    expect(Option::query()->find($option->id))->not->toBeNull();
});

it('refuses to delete an option still assigned to a product', function () {
    $caller = userWithPermissions(['catalog.options.manage', 'catalog.products.manage']);
    $option = Option::factory()->create();
    $product = Product::factory()->configurable()->create();
    $product->options()->attach($option->id);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/options/{$option->id}", ['expected_version' => 1])
        ->assertStatus(409);
});
