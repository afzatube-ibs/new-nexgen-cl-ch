<?php

namespace Database\Factories;

use App\Domains\Operations\Fulfillment\Models\ShipmentNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShipmentNote>
 */
class ShipmentNoteFactory extends Factory
{
    protected $model = ShipmentNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shipment_id' => ShipmentFactory::new(),
            'author_id' => null,
            'body' => fake()->sentence(),
            'is_customer_visible' => false,
        ];
    }
}
