<?php

namespace Database\Factories;

use App\Domains\Commerce\Payments\Models\PaymentWebhookEvent;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PaymentWebhookEvent>
 */
class PaymentWebhookEventFactory extends Factory
{
    protected $model = PaymentWebhookEvent::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'gateway_code' => 'sslcommerz',
            'event_reference' => (string) Str::uuid(),
            'signature_valid' => true,
            'status' => PaymentWebhookEvent::STATUS_RECEIVED,
            'payload' => ['sample' => true],
        ];
    }

    public function processed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PaymentWebhookEvent::STATUS_PROCESSED,
            'processed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'signature_valid' => false,
            'status' => PaymentWebhookEvent::STATUS_REJECTED,
            'processed_at' => now(),
        ]);
    }
}
