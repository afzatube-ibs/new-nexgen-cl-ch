<?php

namespace Database\Factories;

use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ReturnRequest>
 */
class ReturnRequestFactory extends Factory
{
    protected $model = ReturnRequest::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => (string) Str::uuid(),
            'customer_id' => (string) Str::uuid(),
            'rma_number' => 'RMA-'.fake()->unique()->numerify('######'),
            'type' => ReturnRequest::TYPE_RETURN,
            'reason' => ReturnRequest::REASON_DAMAGED,
            'status' => ReturnRequest::STATUS_REQUESTED,
        ];
    }

    public function exchange(): static
    {
        return $this->state(fn (array $attributes) => ['type' => ReturnRequest::TYPE_EXCHANGE]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ReturnRequest::STATUS_APPROVED]);
    }

    public function pickupScheduled(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ReturnRequest::STATUS_PICKUP_SCHEDULED, 'pickup_scheduled_at' => now()]);
    }

    public function received(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ReturnRequest::STATUS_RECEIVED, 'received_at' => now()]);
    }

    public function inspecting(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ReturnRequest::STATUS_INSPECTING, 'inspection_started_at' => now()]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ReturnRequest::STATUS_REJECTED, 'rejected_at' => now(), 'rejection_reason' => 'Not eligible.']);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => ['status' => ReturnRequest::STATUS_CANCELLED, 'cancelled_at' => now()]);
    }
}
