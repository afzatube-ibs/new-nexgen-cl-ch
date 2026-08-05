<?php

namespace Database\Factories;

use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = Order::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'customer_name' => fake()->name(),
            'customer_email' => fake()->unique()->safeEmail(),
            'customer_phone' => fake()->e164PhoneNumber(),
            'currency_code' => 'USD',
            'subtotal' => '100.0000',
            'discount_total' => '0.0000',
            'tax_total' => '0.0000',
            'shipping_total' => '0.0000',
            'grand_total' => '100.0000',
            'status' => Order::STATUS_PENDING,
        ];
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Order::STATUS_CONFIRMED]);
    }

    public function processing(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Order::STATUS_PROCESSING]);
    }

    public function shipped(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Order::STATUS_SHIPPED]);
    }

    public function delivered(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Order::STATUS_DELIVERED]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Order::STATUS_CANCELLED]);
    }
}
