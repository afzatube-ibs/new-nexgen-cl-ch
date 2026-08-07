<?php

namespace Database\Factories;

use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotificationTemplate>
 */
class NotificationTemplateFactory extends Factory
{
    protected $model = NotificationTemplate::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'test.'.fake()->unique()->word(),
            'channel' => NotificationTemplate::CHANNEL_EMAIL,
            'locale' => 'en',
            'subject' => fake()->sentence(),
            'body' => 'Hello {{customer_name}}, this is a test template.',
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }
}
