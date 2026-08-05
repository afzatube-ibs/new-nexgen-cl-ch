<?php

namespace Database\Factories;

use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShippingZone>
 */
class ShippingZoneFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = ShippingZone::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->country(),
            'country_code' => 'BD',
            'region' => '',
            'status' => ShippingZone::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ShippingZone::STATUS_ARCHIVED]);
    }
}
