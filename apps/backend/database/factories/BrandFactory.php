<?php

namespace Database\Factories;

use App\Domains\Commerce\Catalog\Models\Brand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Brand>
 */
class BrandFactory extends Factory
{
    protected $model = Brand::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->sentence(),
            'logo_media_id' => null,
            'status' => Brand::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Brand::STATUS_ARCHIVED]);
    }
}
