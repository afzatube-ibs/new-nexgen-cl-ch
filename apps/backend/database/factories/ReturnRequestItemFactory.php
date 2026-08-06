<?php

namespace Database\Factories;

use App\Domains\Operations\Returns\Models\ReturnRequestItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReturnRequestItem>
 */
class ReturnRequestItemFactory extends Factory
{
    protected $model = ReturnRequestItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'return_request_id' => ReturnRequestFactory::new(),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-####??')),
            'description' => fake()->words(3, true),
            'quantity' => fake()->numberBetween(1, 3),
        ];
    }
}
