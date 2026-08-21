<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Audit\AuditLog;
use App\Domains\Commerce\Inventory\Models\Warehouse;

it('denies listing warehouses without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')->getJson('/api/v1/warehouses')->assertStatus(403);
});

it('creates a warehouse given the manage permission, auditing it', function () {
    $caller = userWithPermissions(['inventory.warehouses.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/warehouses', [
        'code' => 'main_dc',
        'name' => 'Main Distribution Center',
        'country_code' => 'US',
    ]);

    $response->assertCreated()->assertJsonPath('data.code', 'main_dc')->assertJsonPath('data.version', 1);
    expect(AuditLog::query()->where('action', 'warehouse.created')->count())->toBe(1);
});

it('setting a warehouse as default unsets the previous default', function () {
    $caller = userWithPermissions(['inventory.warehouses.manage']);
    $first = Warehouse::factory()->default()->create();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/warehouses', [
        'code' => 'second_wh',
        'name' => 'Second Warehouse',
        'is_default' => true,
    ])->assertCreated();

    expect($first->fresh()->is_default)->toBeFalse();
});

it('updates a warehouse when the expected version matches', function () {
    $caller = userWithPermissions(['inventory.warehouses.manage']);
    $warehouse = Warehouse::factory()->create(['name' => 'Original']);

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/warehouses/{$warehouse->id}", [
        'name' => 'Renamed',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Renamed')->assertJsonPath('data.version', 2);
});

it('rejects an update with a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['inventory.warehouses.manage']);
    $warehouse = Warehouse::factory()->create();
    $warehouse->update(['name' => 'Already changed']);

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/warehouses/{$warehouse->id}", ['name' => 'Racing update', 'expected_version' => 1])
        ->assertStatus(409);
});

it('archives a warehouse', function () {
    $caller = userWithPermissions(['inventory.warehouses.manage']);
    $warehouse = Warehouse::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/warehouses/{$warehouse->id}/archive", ['expected_version' => 1])
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');
});

it('refuses to delete a warehouse that still has stock items', function () {
    $caller = userWithPermissions(['inventory.warehouses.manage']);
    $warehouse = Warehouse::factory()->create();
    $warehouse->stockItems()->create(['sku' => 'SKU-1']);

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/warehouses/{$warehouse->id}", ['expected_version' => 1])
        ->assertStatus(409);
});

it('refuses to delete a warehouse that is the destination of a pending transfer, even with no stock items of its own yet', function () {
    // Found during the Inventory Freeze audit: CompleteStockTransferAction
    // only creates the destination's StockItem row when the transfer
    // actually completes, not when it's initiated — so a brand-new,
    // still-empty destination warehouse used to pass the stock-items check
    // above and could be deleted out from under an in-flight transfer.
    $caller = userWithPermissions(['inventory.warehouses.manage', 'inventory.transfers.manage']);
    $source = Warehouse::factory()->create();
    $destination = Warehouse::factory()->create();
    $source->stockItems()->create(['sku' => 'SKU-1', 'quantity_on_hand' => 10]);

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/stock-transfers', [
        'from_warehouse_id' => $source->id,
        'to_warehouse_id' => $destination->id,
        'sku' => 'SKU-1',
        'quantity' => 5,
    ])->assertCreated();

    expect($destination->stockItems()->exists())->toBeFalse();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/warehouses/{$destination->id}", ['expected_version' => 1])
        ->assertStatus(409);
});

it('deletes and restores a warehouse with no stock items', function () {
    $caller = userWithPermissions(['inventory.warehouses.manage']);
    $warehouse = Warehouse::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->deleteJson("/api/v1/warehouses/{$warehouse->id}", ['expected_version' => 1])
        ->assertStatus(204);

    expect(Warehouse::query()->find($warehouse->id))->toBeNull();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/warehouses/{$warehouse->id}/restore")
        ->assertOk();

    expect(Warehouse::query()->find($warehouse->id))->not->toBeNull();
});
