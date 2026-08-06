<?php

namespace Database\Factories;

use App\Domains\Operations\Returns\Models\RefundRequest;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<RefundRequest>
 */
class RefundRequestFactory extends Factory
{
    protected $model = RefundRequest::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'return_request_id' => ReturnRequestFactory::new(),
            'payment_id' => (string) Str::uuid(),
            'amount' => fake()->randomFloat(4, 50, 2000),
            'currency_code' => 'BDT',
            'status' => RefundRequest::STATUS_PENDING,
        ];
    }

    public function processing(): static
    {
        return $this->state(fn (array $attributes) => ['status' => RefundRequest::STATUS_PROCESSING]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => RefundRequest::STATUS_COMPLETED,
            'gateway_reference' => 'RFD-'.fake()->unique()->numerify('########'),
            'completed_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => ['status' => RefundRequest::STATUS_FAILED, 'failure_reason' => 'Gateway unavailable.']);
    }
}
