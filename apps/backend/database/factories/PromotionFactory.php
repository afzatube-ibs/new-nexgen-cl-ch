<?php

namespace Database\Factories;

use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Promotion>
 */
class PromotionFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = Promotion::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(3, true).' Promotion',
            'description' => fake()->sentence(),
            'discount_type' => Promotion::TYPE_PERCENTAGE,
            'discount_value' => '10.0000',
            'currency_code' => null,
            'is_stackable' => false,
            'priority' => 0,
            'requires_coupon' => false,
            'starts_at' => null,
            'ends_at' => null,
            'usage_limit_global' => null,
            'usage_limit_per_customer' => null,
            'status' => Promotion::STATUS_ACTIVE,
        ];
    }

    public function percentage(string $value = '10.0000'): static
    {
        return $this->state(fn (array $attributes) => [
            'discount_type' => Promotion::TYPE_PERCENTAGE,
            'discount_value' => $value,
            'currency_code' => null,
        ]);
    }

    public function fixedAmount(string $value = '5.0000', string $currencyCode = 'USD'): static
    {
        return $this->state(fn (array $attributes) => [
            'discount_type' => Promotion::TYPE_FIXED_AMOUNT,
            'discount_value' => $value,
            'currency_code' => $currencyCode,
        ]);
    }

    public function buyXGetY(
        int $buyQuantity = 2,
        int $getQuantity = 1,
        string $getDiscountPercentage = '100.00',
    ): static {
        return $this->state(fn (array $attributes) => [
            'discount_type' => Promotion::TYPE_BUY_X_GET_Y,
            'discount_value' => null,
            'currency_code' => null,
            'buy_x_quantity' => $buyQuantity,
            'get_y_quantity' => $getQuantity,
            'get_y_discount_percentage' => $getDiscountPercentage,
        ]);
    }

    public function freeShipping(): static
    {
        return $this->state(fn (array $attributes) => [
            'discount_type' => Promotion::TYPE_FREE_SHIPPING,
            'discount_value' => null,
            'currency_code' => null,
        ]);
    }

    public function stackable(): static
    {
        return $this->state(fn (array $attributes) => ['is_stackable' => true]);
    }

    public function requiresCoupon(): static
    {
        return $this->state(fn (array $attributes) => ['requires_coupon' => true]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Promotion::STATUS_ARCHIVED]);
    }
}
