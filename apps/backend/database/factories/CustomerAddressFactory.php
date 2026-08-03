<?php

namespace Database\Factories;

use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerAddress;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerAddress>
 */
class CustomerAddressFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = CustomerAddress::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'label' => fake()->randomElement(['Home', 'Office', null]),
            'recipient_name' => fake()->name(),
            'phone' => fake()->phoneNumber(),
            'address_line1' => fake()->streetAddress(),
            'address_line2' => null,
            'city' => fake()->city(),
            'region' => fake()->state(),
            'postal_code' => fake()->postcode(),
            'country_code' => 'US',
            'is_default_shipping' => false,
            'is_default_billing' => false,
        ];
    }

    public function defaultShipping(): static
    {
        return $this->state(fn (array $attributes) => ['is_default_shipping' => true]);
    }

    public function defaultBilling(): static
    {
        return $this->state(fn (array $attributes) => ['is_default_billing' => true]);
    }
}
