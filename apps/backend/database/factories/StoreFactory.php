<?php

namespace Database\Factories;

use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Store>
 */
class StoreFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = Store::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'legal_name' => fake()->company().' Ltd.',
            'currency_code' => 'USD',
            'locale' => 'en-US',
            'timezone' => 'UTC',
            'contact_email' => fake()->unique()->companyEmail(),
            'contact_phone' => fake()->phoneNumber(),
            'address_line1' => fake()->streetAddress(),
            'city' => fake()->city(),
            'region' => fake()->state(),
            'postal_code' => fake()->postcode(),
            'country_code' => 'US',
            'status' => Store::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Store::STATUS_ARCHIVED,
        ]);
    }
}
