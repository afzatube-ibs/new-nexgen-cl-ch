<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;

it('initiates a transfer, placing a hold on the source warehouse\'s stock', function () {
    $caller = userWithPermissions(['inventory.transfers.manage']);
    $source = Warehouse::factory()->create();
    $destination = Warehouse::factory()->create();
    $stockItem = StockItem::factory()->create(['warehouse_id' => $source->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 100]);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stock-transfers', [
        'from_warehouse_id' => $source->id,
        'to_warehouse_id' => $destination->id,
        'sku' => 'SKU-1',
        'quantity' => 30,
    ]);

    $response->assertCreated()->assertJsonPath('data.status', 'pending');
    expect($stockItem->fresh()->quantity_reserved)->toBe(30);
});

it('refuses to initiate a transfer exceeding the source\'s available stock', function () {
    $caller = userWithPermissions(['inventory.transfers.manage']);
    $source = Warehouse::factory()->create();
    $destination = Warehouse::factory()->create();
    StockItem::factory()->create(['warehouse_id' => $source->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 10]);

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/stock-transfers', [
            'from_warehouse_id' => $source->id,
            'to_warehouse_id' => $destination->id,
            'sku' => 'SKU-1',
            'quantity' => 20,
        ])
        ->assertStatus(409);
});

it('completes a transfer, moving stock from source to a new destination stock item', function () {
    $caller = userWithPermissions(['inventory.transfers.manage']);
    $source = Warehouse::factory()->create();
    $destination = Warehouse::factory()->create();
    $sourceItem = StockItem::factory()->create(['warehouse_id' => $source->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 100]);

    $created = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stock-transfers', [
        'from_warehouse_id' => $source->id,
        'to_warehouse_id' => $destination->id,
        'sku' => 'SKU-1',
        'quantity' => 30,
    ])->assertCreated();

    $transferId = $created->json('data.id');

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/stock-transfers/{$transferId}/complete");

    $response->assertOk()->assertJsonPath('data.status', 'completed');

    $sourceItem->refresh();
    expect($sourceItem->quantity_on_hand)->toBe(70)->and($sourceItem->quantity_reserved)->toBe(0);

    $destinationItem = StockItem::query()->where('warehouse_id', $destination->id)->where('sku', 'SKU-1')->firstOrFail();
    expect($destinationItem->quantity_on_hand)->toBe(30);
});

it('cancels a pending transfer, releasing the source hold without moving stock', function () {
    $caller = userWithPermissions(['inventory.transfers.manage']);
    $source = Warehouse::factory()->create();
    $destination = Warehouse::factory()->create();
    $sourceItem = StockItem::factory()->create(['warehouse_id' => $source->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 100]);

    $created = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stock-transfers', [
        'from_warehouse_id' => $source->id,
        'to_warehouse_id' => $destination->id,
        'sku' => 'SKU-1',
        'quantity' => 30,
    ])->assertCreated();

    $transferId = $created->json('data.id');

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/stock-transfers/{$transferId}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    $sourceItem->refresh();
    expect($sourceItem->quantity_reserved)->toBe(0)->and($sourceItem->quantity_on_hand)->toBe(100);
});

it('refuses to complete an already-completed transfer', function () {
    $caller = userWithPermissions(['inventory.transfers.manage']);
    $source = Warehouse::factory()->create();
    $destination = Warehouse::factory()->create();
    StockItem::factory()->create(['warehouse_id' => $source->id, 'sku' => 'SKU-1', 'quantity_on_hand' => 100]);

    $created = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stock-transfers', [
        'from_warehouse_id' => $source->id,
        'to_warehouse_id' => $destination->id,
        'sku' => 'SKU-1',
        'quantity' => 30,
    ])->assertCreated();
    $transferId = $created->json('data.id');

    $this->actingAs($caller, 'sanctum')->postJson("/api/v1/stock-transfers/{$transferId}/complete")->assertOk();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/stock-transfers/{$transferId}/complete")
        ->assertStatus(409);
});
