<?php

namespace Database\Factories;

use App\Domains\Commerce\Customers\Models\CustomerPasswordResetToken;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<CustomerPasswordResetToken>
 */
class CustomerPasswordResetTokenFactory extends Factory
{
    protected $model = CustomerPasswordResetToken::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'token' => Hash::make(Str::random(64)),
            'created_at' => now(),
        ];
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'created_at' => now()->subHours(2),
        ]);
    }
}
