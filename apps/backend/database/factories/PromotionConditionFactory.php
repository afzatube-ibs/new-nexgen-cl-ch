<?php

namespace Database\Factories;

use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PromotionCondition>
 */
class PromotionConditionFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = PromotionCondition::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'promotion_id' => Promotion::factory(),
            'condition_type' => PromotionCondition::TYPE_PRODUCT,
            'reference_id' => (string) Str::uuid(),
            'numeric_value' => null,
        ];
    }

    public function minimumOrderAmount(string $amount): static
    {
        return $this->state(fn (array $attributes) => [
            'condition_type' => PromotionCondition::TYPE_MINIMUM_ORDER_AMOUNT,
            'reference_id' => null,
            'numeric_value' => $amount,
        ]);
    }
}
