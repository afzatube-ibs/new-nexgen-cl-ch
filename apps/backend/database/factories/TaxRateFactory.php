<?php

namespace Database\Factories;

use App\Domains\Commerce\Pricing\Models\TaxClass;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaxRate>
 */
class TaxRateFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = TaxRate::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tax_zone_id' => TaxZone::factory(),
            'tax_class_id' => TaxClass::factory(),
            'rate' => fake()->randomFloat(4, 0, 25),
            'status' => TaxRate::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => TaxRate::STATUS_ARCHIVED]);
    }
}
