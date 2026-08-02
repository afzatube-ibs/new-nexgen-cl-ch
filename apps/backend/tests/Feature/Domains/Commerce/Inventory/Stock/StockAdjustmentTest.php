<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Audit\AuditLog;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;

it('denies adjusting stock without the manage permission', function () {
    $caller = userWithPermissions(['inventory.stock.view']);
    $warehouse = Warehouse::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/stock-items/adjust', [
            'warehouse_id' => $warehouse->id,
            'sku' => 'SKU-1',
            'quantity_delta' => 10,
            'reason' => 'initial_receipt',
        ])
        ->assertStatus(403);
});

it('creates a stock item on first adjustment and records the movement', function () {
    $caller = userWithPermissions(['inventory.stock.manage']);
    $warehouse = Warehouse::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stock-items/adjust', [
        'warehouse_id' => $warehouse->id,
        'sku' => 'SKU-1',
        'quantity_delta' => 50,
        'reason' => 'initial_receipt',
    ]);

    $response->assertCreated()->assertJsonPath('data.quantityOnHand', 50)->assertJsonPath('data.quantityAvailable', 50);
    expect(AuditLog::query()->where('action', 'stock.adjusted')->count())->toBe(1);
});

it('applies a negative adjustment against existing stock', function () {
    $caller = userWithPermissions(['inventory.stock.manage']);
    $stockItem = StockItem::factory()->create(['quantity_on_hand' => 50]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stock-items/adjust', [
        'warehouse_id' => $stockItem->warehouse_id,
        'sku' => $stockItem->sku,
        'quantity_delta' => -20,
        'reason' => 'damage_writeoff',
    ]);

    $response->assertCreated()->assertJsonPath('data.quantityOnHand', 30);
});

it('refuses an adjustment that would take stock below zero', function () {
    $caller = userWithPermissions(['inventory.stock.manage']);
    $stockItem = StockItem::factory()->create(['quantity_on_hand' => 10]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/stock-items/adjust', [
            'warehouse_id' => $stockItem->warehouse_id,
            'sku' => $stockItem->sku,
            'quantity_delta' => -20,
            'reason' => 'damage_writeoff',
        ])
        ->assertStatus(409);
});

it('lists the adjustment history for a stock item', function () {
    $caller = userWithPermissions(['inventory.stock.manage', 'inventory.stock.view']);
    $warehouse = Warehouse::factory()->create();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stock-items/adjust', [
        'warehouse_id' => $warehouse->id,
        'sku' => 'SKU-1',
        'quantity_delta' => 50,
        'reason' => 'initial_receipt',
    ])->assertCreated();

    $stockItem = StockItem::query()->where('sku', 'SKU-1')->firstOrFail();

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/stock-items/{$stockItem->id}/adjustments");

    $response->assertOk()->assertJsonCount(1, 'data');
});
