<?php

namespace Database\Factories;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = OrderItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $unitPrice = fake()->randomFloat(2, 5, 200);
        $quantity = fake()->numberBetween(1, 3);

        return [
            'order_id' => Order::factory(),
            'product_id' => (string) Str::uuid(),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-#####')),
            'product_name' => fake()->words(3, true),
            'quantity' => $quantity,
            'unit_price' => (string) $unitPrice,
            'discount_amount' => '0.0000',
            'tax_amount' => '0.0000',
            'line_subtotal' => number_format($unitPrice * $quantity, 4, '.', ''),
        ];
    }
}
