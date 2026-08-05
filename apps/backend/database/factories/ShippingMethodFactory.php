<?php

namespace Database\Factories;

use App\Domains\Operations\Shipping\Models\ShippingMethod;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShippingMethod>
 */
class ShippingMethodFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = ShippingMethod::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->slug(2, false),
            'name' => fake()->words(2, true),
            'description' => fake()->optional()->sentence(),
            'provider_code' => null,
            'status' => ShippingMethod::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ShippingMethod::STATUS_ARCHIVED]);
    }

    public function withProvider(string $providerCode): static
    {
        return $this->state(fn (array $attributes) => ['provider_code' => $providerCode]);
    }
}
