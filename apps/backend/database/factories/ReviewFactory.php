<?php

namespace Database\Factories;

use App\Domains\Commerce\Reviews\Models\Review;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Review>
 */
class ReviewFactory extends Factory
{
    protected $model = Review::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => (string) Str::uuid(),
            'customer_id' => (string) Str::uuid(),
            'author_name' => fake()->name(),
            'rating' => fake()->numberBetween(1, 5),
            'title' => fake()->sentence(4),
            'body' => fake()->paragraph(),
            'status' => Review::STATUS_PENDING,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Review::STATUS_APPROVED]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Review::STATUS_REJECTED, 'rejection_reason' => 'Violates community guidelines.']);
    }

    public function verifiedPurchase(): static
    {
        return $this->state(fn (array $attributes) => ['verified_purchase' => true, 'order_id' => (string) Str::uuid()]);
    }
}
