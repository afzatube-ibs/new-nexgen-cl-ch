<?php

namespace Database\Factories;

use App\Domains\Operations\Notifications\Models\NotificationDeliveryAttempt;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotificationDeliveryAttempt>
 */
class NotificationDeliveryAttemptFactory extends Factory
{
    protected $model = NotificationDeliveryAttempt::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'notification_id' => NotificationFactory::new(),
            'provider_code' => 'smtp',
            'status' => NotificationDeliveryAttempt::STATUS_SUCCEEDED,
            'occurred_at' => now(),
        ];
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => NotificationDeliveryAttempt::STATUS_FAILED,
            'failure_reason' => 'Provider unavailable.',
        ]);
    }
}
