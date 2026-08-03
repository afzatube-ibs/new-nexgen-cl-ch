<?php

namespace Database\Factories;

use App\Domains\Platform\Localization\Models\Currency;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Currency>
 */
class CurrencyFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = Currency::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->currencyCode(),
            'name' => fake()->words(2, true),
            'symbol' => fake()->randomElement(['$', '€', '£', '¥']),
            'decimal_places' => 2,
            'exchange_rate' => '1.000000',
            'is_base' => false,
            'status' => Currency::STATUS_ACTIVE,
        ];
    }

    public function base(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_base' => true,
            'exchange_rate' => '1.000000',
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Currency::STATUS_ARCHIVED,
        ]);
    }
}
