<?php

namespace Database\Factories;

use App\Domains\Operations\Notifications\Models\Notification;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'channel' => NotificationTemplate::CHANNEL_EMAIL,
            'recipient' => fake()->safeEmail(),
            'subject' => fake()->sentence(),
            'body' => fake()->paragraph(),
            'status' => Notification::STATUS_PENDING,
        ];
    }

    public function queued(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Notification::STATUS_QUEUED]);
    }

    public function sending(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Notification::STATUS_SENDING]);
    }

    public function sent(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Notification::STATUS_SENT,
            'provider_code' => 'smtp',
            'sent_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Notification::STATUS_FAILED,
            'attempts_count' => 5,
            'max_attempts' => 5,
            'failure_reason' => 'Provider unavailable.',
            'failed_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Notification::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);
    }
}
