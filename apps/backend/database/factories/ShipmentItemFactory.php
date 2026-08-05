<?php

namespace Database\Factories;

use App\Domains\Operations\Fulfillment\Models\ShipmentItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShipmentItem>
 */
class ShipmentItemFactory extends Factory
{
    protected $model = ShipmentItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shipment_id' => ShipmentFactory::new(),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-####??')),
            'description' => fake()->words(3, true),
            'quantity' => fake()->numberBetween(1, 5),
        ];
    }
}
