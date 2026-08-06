<?php

namespace Database\Factories;

use App\Domains\Operations\Returns\Models\ExchangeRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExchangeRequest>
 */
class ExchangeRequestFactory extends Factory
{
    protected $model = ExchangeRequest::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'return_request_id' => ReturnRequestFactory::new()->exchange(),
            'desired_sku' => strtoupper(fake()->unique()->bothify('SKU-####??')),
            'desired_description' => fake()->words(3, true),
            'desired_quantity' => fake()->numberBetween(1, 2),
            'status' => ExchangeRequest::STATUS_PENDING,
        ];
    }

    public function preparing(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ExchangeRequest::STATUS_PREPARING]);
    }

    public function shipped(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ExchangeRequest::STATUS_SHIPPED, 'tracking_number' => 'TRK-'.fake()->unique()->numerify('########')]);
    }
}
