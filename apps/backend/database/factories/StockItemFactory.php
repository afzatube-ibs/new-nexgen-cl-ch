<?php

namespace Database\Factories;

use App\Domains\Commerce\Inventory\Models\StockItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<StockItem>
 */
class StockItemFactory extends Factory
{
    protected $model = StockItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'warehouse_id' => WarehouseFactory::new(),
            'sku' => strtoupper(Str::random(10)),
            'quantity_on_hand' => fake()->numberBetween(10, 200),
            'quantity_reserved' => 0,
        ];
    }
}
