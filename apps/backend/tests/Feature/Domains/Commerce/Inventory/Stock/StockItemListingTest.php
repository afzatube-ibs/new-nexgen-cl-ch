<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Models\StockItem;

/**
 * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) —
 * the real "Low Stock" widget's own backend support: `quantity_lte`
 * filters on the computed `quantity_on_hand - quantity_reserved`
 * expression (no stored "available" column exists), ordering ascending so
 * the real lowest-stock items surface first.
 */
it('denies listing stock items without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/stock-items')
        ->assertStatus(403);
});

it('filters stock items by quantity_lte, ordering the lowest-stock items first', function () {
    $caller = userWithPermissions(['inventory.stock.view']);
    $low = StockItem::factory()->create(['sku' => 'LOW-1', 'quantity_on_hand' => 3, 'quantity_reserved' => 0]);
    $lowest = StockItem::factory()->create(['sku' => 'LOW-0', 'quantity_on_hand' => 1, 'quantity_reserved' => 0]);
    StockItem::factory()->create(['sku' => 'HEALTHY-1', 'quantity_on_hand' => 500, 'quantity_reserved' => 0]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/stock-items?quantity_lte=10');

    $response->assertOk();
    $skus = collect($response->json('data'))->pluck('sku')->all();
    expect($skus)->toBe([$lowest->sku, $low->sku]);
});

it('counts reserved quantity against the quantity_lte threshold, not just quantity_on_hand', function () {
    $caller = userWithPermissions(['inventory.stock.view']);
    // On hand looks healthy, but almost all of it is reserved — genuinely low available stock.
    StockItem::factory()->create(['sku' => 'RESERVED-HEAVY', 'quantity_on_hand' => 100, 'quantity_reserved' => 95]);
    StockItem::factory()->create(['sku' => 'UNRESERVED-HEALTHY', 'quantity_on_hand' => 100, 'quantity_reserved' => 0]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/stock-items?quantity_lte=10');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.sku', 'RESERVED-HEAVY');
});

it('does not filter by quantity when quantity_lte is omitted', function () {
    $caller = userWithPermissions(['inventory.stock.view']);
    StockItem::factory()->create(['sku' => 'ANY-1', 'quantity_on_hand' => 1]);
    StockItem::factory()->create(['sku' => 'ANY-2', 'quantity_on_hand' => 500]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/stock-items');

    $response->assertOk()->assertJsonCount(2, 'data');
});
