<?php

namespace Database\Factories;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderTimelineEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderTimelineEvent>
 */
class OrderTimelineEventFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = OrderTimelineEvent::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'event_type' => OrderTimelineEvent::TYPE_ORDER_PLACED,
            'description' => 'Order placed.',
            'occurred_at' => now(),
        ];
    }
}
