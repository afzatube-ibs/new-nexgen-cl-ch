<?php

namespace Database\Factories;

use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReturnTimelineEvent>
 */
class ReturnTimelineEventFactory extends Factory
{
    protected $model = ReturnTimelineEvent::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'return_request_id' => ReturnRequestFactory::new(),
            'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
            'description' => fake()->sentence(),
            'occurred_at' => now(),
        ];
    }
}
