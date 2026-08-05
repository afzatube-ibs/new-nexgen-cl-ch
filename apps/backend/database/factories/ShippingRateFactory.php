<?php

namespace Database\Factories;

use App\Domains\Operations\Shipping\Models\ShippingRate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShippingRate>
 */
class ShippingRateFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = ShippingRate::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shipping_zone_id' => ShippingZoneFactory::new(),
            'shipping_method_id' => ShippingMethodFactory::new(),
            'min_weight_grams' => 0,
            'max_weight_grams' => null,
            'amount' => fake()->randomFloat(4, 30, 500),
            'currency_code' => 'BDT',
            'status' => ShippingRate::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ShippingRate::STATUS_ARCHIVED]);
    }
}
