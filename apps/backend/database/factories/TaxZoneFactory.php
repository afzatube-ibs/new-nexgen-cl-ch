<?php

namespace Database\Factories;

use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaxZone>
 */
class TaxZoneFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = TaxZone::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->country(),
            'country_code' => 'US',
            'region' => '',
            'status' => TaxZone::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => TaxZone::STATUS_ARCHIVED]);
    }
}
