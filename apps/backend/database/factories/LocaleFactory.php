<?php

namespace Database\Factories;

use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Locale>
 */
class LocaleFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = Locale::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->languageCode(),
            'name' => fake()->unique()->words(2, true),
            'native_name' => fake()->words(2, true),
            'is_rtl' => false,
            'is_default' => false,
            'status' => Locale::STATUS_ACTIVE,
        ];
    }

    public function default(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_default' => true,
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Locale::STATUS_ARCHIVED,
        ]);
    }
}
