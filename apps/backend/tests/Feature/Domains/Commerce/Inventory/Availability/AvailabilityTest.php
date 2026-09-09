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

it('returns real aggregate availability for many skus in one request', function () {
    $caller = userWithPermissions(['inventory.availability.view']);
    $warehouseA = Warehouse::factory()->create();
    $warehouseB = Warehouse::factory()->create();
    $archivedWarehouse = Warehouse::factory()->archived()->create();

    StockItem::factory()->create(['warehouse_id' => $warehouseA->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 12, 'quantity_reserved' => 2]);
    StockItem::factory()->create(['warehouse_id' => $warehouseB->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 4, 'quantity_reserved' => 4]);
    StockItem::factory()->create(['warehouse_id' => $warehouseA->id, 'sku' => 'SKU-2', 'quantity_on_hand' => 3, 'quantity_reserved' => 3]);
    StockItem::factory()->create(['warehouse_id' => $archivedWarehouse->id, 'sku' => 'SKU-2', 'quantity_on_hand' => 100]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/inventory/availability-many?skus=SKU-1,sku-2,SKU-MISSING');

    $response->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.sku', 'SKU-1')
        ->assertJsonPath('data.0.totalAvailable', 10)
        ->assertJsonPath('data.0.isAvailable', true)
        ->assertJsonPath('data.1.sku', 'SKU-2')
        ->assertJsonPath('data.1.totalAvailable', 0)
        ->assertJsonPath('data.1.isAvailable', false)
        ->assertJsonPath('data.2.sku', 'SKU-MISSING')
        ->assertJsonPath('data.2.totalAvailable', 0)
        ->assertJsonPath('data.2.isAvailable', false);
});

it('requires the dedicated aggregate availability permission for batched availability', function () {
    $caller = userWithPermissions(['inventory.stock.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/inventory/availability-many?skus=SKU-1')
        ->assertForbidden();
});
