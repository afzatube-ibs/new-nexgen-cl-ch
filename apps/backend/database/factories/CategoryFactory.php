<?php

namespace Database\Factories;

use App\Domains\Commerce\Catalog\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->sentence(),
            'status' => Category::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Category::STATUS_ARCHIVED]);
    }
}
