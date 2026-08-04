<?php

namespace Database\Factories;

use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionRedemption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PromotionRedemption>
 */
class PromotionRedemptionFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = PromotionRedemption::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'promotion_id' => Promotion::factory(),
            'coupon_id' => null,
            'customer_id' => null,
            'order_reference' => null,
            'discount_amount' => '10.0000',
            'currency_code' => 'USD',
            'redeemed_at' => now(),
        ];
    }
}
