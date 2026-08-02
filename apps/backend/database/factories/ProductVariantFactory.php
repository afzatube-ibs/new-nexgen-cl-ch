<?php

namespace Database\Factories;

use App\Domains\Commerce\Catalog\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => ProductFactory::new()->configurable(),
            'sku' => strtoupper(Str::random(10)),
            'status' => ProductVariant::STATUS_ACTIVE,
        ];
    }
}
