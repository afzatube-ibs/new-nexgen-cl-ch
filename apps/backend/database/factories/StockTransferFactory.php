<?php

namespace Database\Factories;

use App\Domains\Commerce\Inventory\Models\StockTransfer;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<StockTransfer>
 */
class StockTransferFactory extends Factory
{
    protected $model = StockTransfer::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'from_warehouse_id' => WarehouseFactory::new(),
            'to_warehouse_id' => WarehouseFactory::new(),
            'sku' => strtoupper(Str::random(10)),
            'quantity' => fake()->numberBetween(1, 20),
            'status' => StockTransfer::STATUS_PENDING,
        ];
    }
}
