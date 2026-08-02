<?php

namespace Database\Factories;

use App\Domains\Commerce\Catalog\Models\AttributeGroup;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AttributeGroup>
 */
class AttributeGroupFactory extends Factory
{
    protected $model = AttributeGroup::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'code' => Str::slug($name, '_'),
            'name' => $name,
        ];
    }
}
