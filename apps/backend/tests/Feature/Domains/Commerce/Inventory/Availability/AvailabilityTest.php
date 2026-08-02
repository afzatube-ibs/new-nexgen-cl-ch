<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;

it('sums availability for a sku across active warehouses', function () {
    $caller = userWithPermissions(['inventory.stock.view']);
    $warehouseA = Warehouse::factory()->create();
    $warehouseB = Warehouse::factory()->create();
    $archivedWarehouse = Warehouse::factory()->archived()->create();

    StockItem::factory()->create(['warehouse_id' => $warehouseA->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 40, 'quantity_reserved' => 10]);
    StockItem::factory()->create(['warehouse_id' => $warehouseB->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 15, 'quantity_reserved' => 0]);
    StockItem::factory()->create(['warehouse_id' => $archivedWarehouse->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 1000]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/inventory/availability?sku=SKU-1');

    $response->assertOk()
        ->assertJsonPath('data.sku', 'SKU-1')
        ->assertJsonPath('data.totalAvailable', 45)
        ->assertJsonCount(2, 'data.byWarehouse');
});
