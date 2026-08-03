<?php

namespace Database\Factories;

use App\Domains\Platform\Installer\Models\Installation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Installation>
 */
class InstallationFactory extends Factory
{
    // Declared explicitly for the same reason UserFactory declares it —
    // this model's namespace does not match Laravel's default
    // factory<->model name-guessing convention.
    protected $model = Installation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'installed_by' => fake()->uuid(),
        ];
    }
}
