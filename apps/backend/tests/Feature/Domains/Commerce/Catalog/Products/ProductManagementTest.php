<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Audit\AuditLog;
use App\Domains\Commerce\Catalog\Models\Category;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Str;

function validProductPayload(array $overrides = []): array
{
    return array_merge([
        'sku' => 'SKU-'.strtoupper(Str::random(6)),
        'name' => 'Wireless Mouse',
        'description' => 'A wireless mouse.',
    ], $overrides);
}

it('denies listing products without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')->getJson('/api/v1/products')->assertStatus(403);
});

it('creates a product in draft status by default, publishing ProductCreated', function () {
    $caller = userWithPermissions(['catalog.products.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/products', validProductPayload());

    $response->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.productType', 'simple')
        ->assertJsonPath('data.version', 1);

    expect(AuditLog::query()->where('action', 'product.created')->count())->toBe(1);
});

it('rejects creating a product with a duplicate sku', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    Product::factory()->create(['sku' => 'DUPLICATE']);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/products', validProductPayload(['sku' => 'DUPLICATE']))
        ->assertStatus(422);
});

it('updates a product', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create(['name' => 'Original']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/products/{$product->id}", [
        'name' => 'Renamed',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Renamed')->assertJsonPath('data.version', 2);
    expect(AuditLog::query()->where('action', 'product.updated')->count())->toBe(1);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();
    $product->update(['name' => 'Already changed']);

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/products/{$product->id}", ['name' => 'Racing update', 'expected_version' => 1])
        ->assertStatus(409);
});

it('refuses to publish a product with no category assigned', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/publish", ['expected_version' => 1])
        ->assertStatus(422)
        ->assertJsonPath('error.type', 'validation_failed');
});

it('publishes a product once it has a category, setting published_at', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();
    $category = Category::factory()->create();
    $product->categories()->attach($category->id);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/products/{$product->id}/publish", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'active');
    expect($product->fresh()->published_at)->not->toBeNull();
});

it('refuses to publish a configurable product with no variants', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->configurable()->create();
    $category = Category::factory()->create();
    $product->categories()->attach($category->id);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/publish", ['expected_version' => 1])
        ->assertStatus(422);
});

it('archives a product', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->active()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/products/{$product->id}/archive", [
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'archived');
});

it('deletes a product', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}", ['expected_version' => 1])
        ->assertStatus(204);

    expect(Product::query()->find($product->id))->toBeNull();
});

it('restores a deleted product', function () {
    $caller = userWithPermissions(['catalog.products.manage']);
    $product = Product::factory()->create();
    $product->delete();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $product->id);

    expect(Product::query()->find($product->id))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'product.restored')->count())->toBe(1);
});

it('filters products by status and search term', function () {
    $caller = userWithPermissions(['catalog.products.view']);
    Product::factory()->active()->create(['name' => 'Findable Widget']);
    Product::factory()->create(['name' => 'Other Thing']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/products?status=active&search=Findable');

    expect($response->json('meta.total'))->toBe(1);
    expect($response->json('data.0.name'))->toBe('Findable Widget');
});

it('returns 404, not a stack trace, for a nonexistent product', function () {
    $caller = userWithPermissions(['catalog.products.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/products/'.Str::uuid())
        ->assertStatus(404)
        ->assertJsonPath('error.type', 'not_found');
});
