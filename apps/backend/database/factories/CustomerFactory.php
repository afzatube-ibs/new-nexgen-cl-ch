<?php

namespace Database\Factories;

use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = Customer::class;

    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            // `phone` carries a real, DB-level unique constraint as of
            // Phase 4.0 Slice 4.1 — must be `unique()` here too, or two
            // factory-created customers can collide on a real constraint
            // violation rather than a predictable test failure.
            'phone' => fake()->unique()->phoneNumber(),
            'status' => Customer::STATUS_ACTIVE,
            'phone_verification_status' => Customer::PHONE_UNVERIFIED,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Customer::STATUS_ARCHIVED,
        ]);
    }
}
