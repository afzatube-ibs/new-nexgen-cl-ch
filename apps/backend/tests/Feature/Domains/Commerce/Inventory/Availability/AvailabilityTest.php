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

it('returns batched aggregate availability without exposing warehouse detail', function () {
    $caller = userWithPermissions(['inventory.availability.view']);
    $warehouse = Warehouse::factory()->create();
    $archivedWarehouse = Warehouse::factory()->archived()->create();

    StockItem::factory()->create(['warehouse_id' => $warehouse->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 20, 'quantity_reserved' => 5]);
    StockItem::factory()->create(['warehouse_id' => $warehouse->id, 'sku' => 'SKU-2', 'quantity_on_hand' => 7, 'quantity_reserved' => 7]);
    StockItem::factory()->create(['warehouse_id' => $archivedWarehouse->id, 'sku' => 'SKU-2', 'quantity_on_hand' => 100]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/inventory/availability-many?skus=SKU-1,SKU-2,SKU-MISSING');

    $response->assertOk()
        ->assertJsonPath('data.0.sku', 'SKU-1')
        ->assertJsonPath('data.0.totalAvailable', 15)
        ->assertJsonPath('data.1.sku', 'SKU-2')
        ->assertJsonPath('data.1.totalAvailable', 0)
        ->assertJsonPath('data.2.sku', 'SKU-MISSING')
        ->assertJsonPath('data.2.totalAvailable', 0)
        ->assertJsonMissingPath('data.0.byWarehouse');
});

it('protects batched availability with the narrow storefront permission', function () {
    $caller = userWithPermissions(['inventory.stock.view']);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/inventory/availability-many?skus=SKU-1')
        ->assertForbidden();
});
