<?php

namespace Database\Factories;

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductSearchIndex>
 */
class ProductSearchIndexFactory extends Factory
{
    protected $model = ProductSearchIndex::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->words(3, true);

        return [
            'product_id' => fake()->uuid(),
            'sku' => strtoupper(fake()->bothify('SKU-####-??')),
            'name' => $name,
            'searchable_text' => $name.' '.fake()->sentence(),
            'status' => Product::STATUS_ACTIVE,
            'visibility' => Product::VISIBILITY_CATALOG_SEARCH,
            'brand_id' => null,
            'published_at' => now(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Product::STATUS_DRAFT]);
    }

    public function notVisible(): static
    {
        return $this->state(fn (array $attributes) => ['visibility' => Product::VISIBILITY_NOT_VISIBLE]);
    }
}
