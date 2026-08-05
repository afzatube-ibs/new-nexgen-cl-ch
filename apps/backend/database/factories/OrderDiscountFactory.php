<?php

namespace Database\Factories;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderDiscount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderDiscount>
 */
class OrderDiscountFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = OrderDiscount::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'promotion_id' => null,
            'code' => null,
            'label' => fake()->words(2, true).' discount',
            'amount' => '10.0000',
        ];
    }
}
