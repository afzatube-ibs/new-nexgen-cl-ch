<?php

namespace Database\Factories;

use App\Domains\Commerce\Catalog\Models\Collection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Collection>
 */
class CollectionFactory extends Factory
{
    protected $model = Collection::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->sentence(),
            'status' => Collection::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Collection::STATUS_ARCHIVED]);
    }
}
