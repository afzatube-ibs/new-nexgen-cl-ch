<?php

namespace Database\Factories;

use App\Domains\Commerce\Pricing\Models\PriceList;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceList>
 */
class PriceListFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = PriceList::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(3, true).' Price List',
            'currency_code' => 'USD',
            'is_default' => false,
            'status' => PriceList::STATUS_ACTIVE,
        ];
    }

    public function default(): static
    {
        return $this->state(fn (array $attributes) => ['is_default' => true]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => PriceList::STATUS_ARCHIVED]);
    }
}
