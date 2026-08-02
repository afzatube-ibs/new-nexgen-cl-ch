<?php

namespace Database\Factories;

use App\Domains\Commerce\Catalog\Models\Option;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Option>
 */
class OptionFactory extends Factory
{
    protected $model = Option::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'code' => Str::slug($name, '_'),
            'name' => ucfirst($name),
        ];
    }
}
