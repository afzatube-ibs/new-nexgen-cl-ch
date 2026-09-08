<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Platform\Media\Models\MediaAsset;

it('includes product media in list responses used by storefront cards', function () {
    $caller = userWithPermissions(['catalog.products.view']);
    $product = Product::factory()->active()->create(['name' => 'Storefront Card Product']);
    $asset = MediaAsset::factory()->create([
        'disk' => 'public',
        'path' => 'media/storefront-card.jpg',
        'filename' => 'storefront-card.jpg',
        'alt_text' => 'Storefront card product image',
    ]);

    $product->images()->create([
        'media_id' => $asset->id,
        'position' => 0,
        'is_primary' => true,
    ]);

    $response = $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/products?status=active&search=Storefront%20Card');

    $response->assertOk()
        ->assertJsonPath('data.0.id', $product->id)
        ->assertJsonPath('data.0.images.0.mediaId', $asset->id)
        ->assertJsonPath('data.0.images.0.altText', 'Storefront card product image')
        ->assertJsonPath('data.0.images.0.isPrimary', true);

    expect($response->json('data.0.images.0.url'))->toContain('/storage/media/storefront-card.jpg');
});
