<?php

namespace Database\Factories;

use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Warehouse>
 */
class WarehouseFactory extends Factory
{
    protected $model = Warehouse::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->city().' Warehouse';

        return [
            'code' => Str::slug($name, '_'),
            'name' => $name,
            'address_line1' => fake()->streetAddress(),
            'city' => fake()->city(),
            'country_code' => 'US',
            'is_default' => false,
            'status' => Warehouse::STATUS_ACTIVE,
        ];
    }

    public function default(): static
    {
        return $this->state(fn (array $attributes) => ['is_default' => true]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => Warehouse::STATUS_ARCHIVED]);
    }
}
