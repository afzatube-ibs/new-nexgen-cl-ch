<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\StockReservation;

it('reserves stock, reducing what is available', function () {
    $caller = userWithPermissions(['inventory.reservations.manage']);
    $stockItem = StockItem::factory()->create(['quantity_on_hand' => 50, 'quantity_reserved' => 0]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/stock-items/{$stockItem->id}/reservations", [
        'quantity' => 20,
        'reference_type' => 'external_cart',
        'reference_id' => 'cart-123',
    ]);

    $response->assertCreated()->assertJsonPath('data.quantity', 20)->assertJsonPath('data.status', 'active');
    expect($stockItem->fresh()->available())->toBe(30);
});

it('refuses to reserve more than is available, never overselling', function () {
    $caller = userWithPermissions(['inventory.reservations.manage']);
    $stockItem = StockItem::factory()->create(['quantity_on_hand' => 10, 'quantity_reserved' => 5]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/stock-items/{$stockItem->id}/reservations", ['quantity' => 6])
        ->assertStatus(409);

    expect($stockItem->fresh()->quantity_reserved)->toBe(5);
});

it('releases an active reservation, restoring availability', function () {
    $caller = userWithPermissions(['inventory.reservations.manage']);
    $stockItem = StockItem::factory()->create(['quantity_on_hand' => 50, 'quantity_reserved' => 20]);
    $reservation = $stockItem->reservations()->create(['quantity' => 20]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/reservations/{$reservation->id}/release");

    $response->assertOk()->assertJsonPath('data.status', 'released');
    expect($stockItem->fresh()->quantity_reserved)->toBe(0);
});

it('commits an active reservation, permanently reducing on-hand stock', function () {
    $caller = userWithPermissions(['inventory.reservations.manage']);
    $stockItem = StockItem::factory()->create(['quantity_on_hand' => 50, 'quantity_reserved' => 20]);
    $reservation = $stockItem->reservations()->create(['quantity' => 20]);

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/reservations/{$reservation->id}/commit");

    $response->assertOk()->assertJsonPath('data.status', 'committed');
    $fresh = $stockItem->fresh();
    expect($fresh->quantity_on_hand)->toBe(30)->and($fresh->quantity_reserved)->toBe(0);
});

it('refuses to release or commit a reservation that is already terminal', function () {
    $caller = userWithPermissions(['inventory.reservations.manage']);
    $stockItem = StockItem::factory()->create(['quantity_on_hand' => 50, 'quantity_reserved' => 20]);
    $reservation = $stockItem->reservations()->create(['quantity' => 20, 'status' => StockReservation::STATUS_RELEASED]);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/reservations/{$reservation->id}/commit")
        ->assertStatus(409);
});
