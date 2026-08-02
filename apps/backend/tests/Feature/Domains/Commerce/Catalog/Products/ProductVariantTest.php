<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Audit\AuditLog;
use App\Domains\Commerce\Catalog\Models\Option;
use App\Domains\Commerce\Catalog\Models\Product;

function makeConfigurableProductWithOption(): array
{
    $product = Product::factory()->configurable()->create();
    $option = Option::factory()->create(['code' => 'color', 'name' => 'Color']);
    $red = $option->values()->create(['value' => 'Red', 'slug' => 'red']);
    $blue = $option->values()->create(['value' => 'Blue', 'slug' => 'blue']);
    $product->options()->attach($option->id);

    return [$product, $option, $red, $blue];
}

it('refuses to add a variant to a simple product', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/variants", [
            'sku' => 'VARIANT-1',
            'option_value_ids' => [],
        ])
        ->assertStatus(422);
});

it('adds a variant to a configurable product, publishing VariantAdded', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    [$product, , $red] = makeConfigurableProductWithOption();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/products/{$product->id}/variants", [
        'sku' => 'VARIANT-RED',
        'option_value_ids' => [$red->id],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.sku', 'VARIANT-RED')
        ->assertJsonPath('data.optionValues.0.value', 'Red');

    expect(AuditLog::query()->where('action', 'product_variant.added')->count())->toBe(1);
});

it('refuses a variant built from an option value the product has not declared', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->configurable()->create();
    $foreignOption = Option::factory()->create();
    $foreignValue = $foreignOption->values()->create(['value' => 'X', 'slug' => 'x']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/variants", [
            'sku' => 'VARIANT-BAD',
            'option_value_ids' => [$foreignValue->id],
        ])
        ->assertStatus(422);
});

it('refuses a duplicate option value combination for the same product', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    [$product, , $red] = makeConfigurableProductWithOption();
    $product->variants()->create(['sku' => 'V1'])->optionValues()->attach($red->id);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/variants", [
            'sku' => 'V2',
            'option_value_ids' => [$red->id],
        ])
        ->assertStatus(422);
});

it('updates a variant', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    [$product, , $red] = makeConfigurableProductWithOption();
    $variant = $product->variants()->create(['sku' => 'V1']);
    $variant->optionValues()->attach($red->id);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/products/{$product->id}/variants/{$variant->id}", [
        'barcode' => '012345678905',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.barcode', '012345678905');
});

it('archives and deletes a variant', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    [$product, , $red] = makeConfigurableProductWithOption();
    $variant = $product->variants()->create(['sku' => 'V1']);
    $variant->optionValues()->attach($red->id);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/variants/{$variant->id}/archive", ['expected_version' => 1])
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}/variants/{$variant->id}", ['expected_version' => 2])
        ->assertStatus(204);
});
