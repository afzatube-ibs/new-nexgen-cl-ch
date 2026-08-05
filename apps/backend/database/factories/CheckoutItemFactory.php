<?php

namespace Database\Factories;

use App\Domains\Commerce\Checkout\Models\CheckoutItem;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CheckoutItem>
 */
class CheckoutItemFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = CheckoutItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'checkout_session_id' => CheckoutSession::factory(),
            'product_id' => (string) Str::uuid(),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-#####')),
            'product_name' => fake()->words(3, true),
            'category_ids' => [],
            'quantity' => fake()->numberBetween(1, 3),
            'tax_class_id' => null,
            'unit_price' => null,
            'tax_amount' => null,
        ];
    }

    public function priced(string $unitPrice = '25.0000', string $taxAmount = '0.0000'): static
    {
        return $this->state(fn (array $attributes) => [
            'unit_price' => $unitPrice,
            'tax_amount' => $taxAmount,
        ]);
    }
}
