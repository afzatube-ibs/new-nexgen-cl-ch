<?php

namespace Database\Factories;

use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShipmentTimelineEvent>
 */
class ShipmentTimelineEventFactory extends Factory
{
    protected $model = ShipmentTimelineEvent::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shipment_id' => ShipmentFactory::new(),
            'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
            'description' => fake()->sentence(),
            'occurred_at' => now(),
        ];
    }
}
