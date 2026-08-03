<?php

namespace Database\Factories;

use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceListEntry>
 */
class PriceListEntryFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = PriceListEntry::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'price_list_id' => PriceList::factory(),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-#####')),
            'base_price' => fake()->randomFloat(2, 5, 500),
            'compare_at_price' => null,
            'sale_price' => null,
            'sale_starts_at' => null,
            'sale_ends_at' => null,
        ];
    }

    public function onSale(): static
    {
        return $this->state(fn (array $attributes) => [
            'sale_price' => round(((float) $attributes['base_price']) * 0.8, 2),
        ]);
    }
}
