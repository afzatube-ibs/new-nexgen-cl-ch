<?php

namespace Database\Factories;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'gateway_code' => 'cod',
            'currency_code' => 'USD',
            'amount' => '100.0000',
            'amount_captured' => '0.0000',
            'status' => Payment::STATUS_PENDING,
            'idempotency_key' => (string) Str::uuid(),
        ];
    }

    public function authorized(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Payment::STATUS_AUTHORIZED,
            'authorized_at' => now(),
        ]);
    }

    public function captured(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Payment::STATUS_CAPTURED,
            'amount_captured' => $attributes['amount'] ?? '100.0000',
            'captured_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Payment::STATUS_FAILED,
            'failure_reason' => 'Gateway declined the payment.',
            'failed_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Payment::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);
    }

    public function gateway(string $code): static
    {
        return $this->state(fn (array $attributes) => ['gateway_code' => $code]);
    }
}
