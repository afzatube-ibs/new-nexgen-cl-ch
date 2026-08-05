<?php

namespace Database\Factories;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderAddress;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderAddress>
 */
class OrderAddressFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = OrderAddress::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'address_type' => OrderAddress::TYPE_SHIPPING,
            'recipient_name' => fake()->name(),
            'phone' => fake()->e164PhoneNumber(),
            'address_line1' => fake()->streetAddress(),
            'address_line2' => null,
            'city' => fake()->city(),
            'region' => fake()->state(),
            'postal_code' => fake()->postcode(),
            'country_code' => 'US',
        ];
    }

    public function billing(): static
    {
        return $this->state(fn (array $attributes) => ['address_type' => OrderAddress::TYPE_BILLING]);
    }
}
