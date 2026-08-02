<?php

namespace Database\Factories;

use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'sku' => strtoupper(Str::random(8)),
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->paragraph(),
            'short_description' => fake()->sentence(),
            'product_type' => Product::TYPE_SIMPLE,
            'status' => Product::STATUS_DRAFT,
            'visibility' => Product::VISIBILITY_CATALOG_SEARCH,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Product::STATUS_ACTIVE,
            'published_at' => now(),
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Product::STATUS_ARCHIVED]);
    }

    public function configurable(): static
    {
        return $this->state(fn (array $attributes) => ['product_type' => Product::TYPE_CONFIGURABLE]);
    }
}
