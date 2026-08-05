<?php

namespace Database\Factories;

use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentAttempt>
 */
class PaymentAttemptFactory extends Factory
{
    protected $model = PaymentAttempt::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'payment_id' => Payment::factory(),
            'type' => PaymentAttempt::TYPE_INITIATION,
            'status' => PaymentAttempt::STATUS_PENDING,
            'gateway_code' => 'cod',
            'amount' => '100.0000',
            'currency_code' => 'USD',
        ];
    }

    public function succeeded(): static
    {
        return $this->state(fn (array $attributes) => ['status' => PaymentAttempt::STATUS_SUCCEEDED]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PaymentAttempt::STATUS_FAILED,
            'failure_reason' => 'Gateway declined the payment.',
        ]);
    }

    public function type(string $type): static
    {
        return $this->state(fn (array $attributes) => ['type' => $type]);
    }
}
