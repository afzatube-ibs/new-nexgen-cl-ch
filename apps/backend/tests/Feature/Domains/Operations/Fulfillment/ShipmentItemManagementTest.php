<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentItem;

it('denies adding an item without the manage permission', function () {
    $caller = userWithPermissions([]);
    $shipment = Shipment::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/shipments/{$shipment->id}/items", ['sku' => 'SKU-1', 'quantity' => 1])
        ->assertStatus(403);
});

it('adds an item to a pending shipment', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);
    $shipment = Shipment::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/items", [
        'sku' => 'SKU-RED-TSHIRT-M',
        'description' => 'Red T-Shirt, Medium',
        'quantity' => 2,
    ]);

    $response->assertCreated()->assertJsonPath('data.sku', 'SKU-RED-TSHIRT-M')->assertJsonPath('data.quantity', 2);
    expect($shipment->items()->count())->toBe(1);
});

it('removes an item from a pending shipment', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);
    $shipment = Shipment::factory()->create();
    $item = ShipmentItem::factory()->create(['shipment_id' => $shipment->id]);

    $response = $this->actingAs($caller, 'sanctum')->deleteJson("/api/v1/shipments/{$shipment->id}/items/{$item->id}");

    $response->assertStatus(204);
    expect(ShipmentItem::query()->find($item->id))->toBeNull();
});

it('refuses to change items once a shipment is packed', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);
    $shipment = Shipment::factory()->packed()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/shipments/{$shipment->id}/items", ['sku' => 'SKU-1', 'quantity' => 1])
        ->assertStatus(422);
});
