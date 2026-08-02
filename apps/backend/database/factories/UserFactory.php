<?php

namespace Database\Factories;

use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    // Declared explicitly because this model's namespace (App\Domains\
    // Platform\IdentityAccess\Models\User) does not match Laravel's default
    // factory<->model name-guessing convention — see User::newFactory()'s
    // docblock for the other half of this same accommodation.
    protected $model = User::class;

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
            'status' => User::STATUS_ACTIVE,
        ];
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => User::STATUS_ARCHIVED,
        ]);
    }
}
