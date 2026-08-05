<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentItem;

it('denies picking without the pick permission', function () {
    $caller = userWithPermissions([]);
    $shipment = Shipment::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/shipments/{$shipment->id}/pick/start", ['expected_version' => 1])
        ->assertStatus(403);
});

it('refuses to start picking a shipment with no items', function () {
    $caller = userWithPermissions(['fulfillment.shipments.pick']);
    $shipment = Shipment::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/shipments/{$shipment->id}/pick/start", ['expected_version' => 1])
        ->assertStatus(422);
});

it('walks a shipment through pick, pack, dispatch, in-transit, and delivery', function () {
    $picker = userWithPermissions(['fulfillment.shipments.manage', 'fulfillment.shipments.pick']);
    $packer = userWithPermissions(['fulfillment.shipments.pack']);
    $dispatcher = userWithPermissions(['fulfillment.shipments.dispatch']);

    $shipment = Shipment::factory()->create();
    ShipmentItem::factory()->create(['shipment_id' => $shipment->id]);

    $response = $this->actingAs($picker, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/pick/start", ['expected_version' => 1]);
    $response->assertOk()->assertJsonPath('data.status', 'picking');

    $response = $this->actingAs($picker, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/pick/complete", ['expected_version' => 2]);
    $response->assertOk()->assertJsonPath('data.status', 'picked');

    $response = $this->actingAs($packer, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/pack/start", ['expected_version' => 3]);
    $response->assertOk()->assertJsonPath('data.status', 'packing');

    // Cannot mark packed without a recorded weight.
    $this->actingAs($packer, 'sanctum')
        ->postJson("/api/v1/shipments/{$shipment->id}/pack/complete", ['expected_version' => 4])
        ->assertStatus(422);

    $this->actingAs($picker, 'sanctum')->patchJson("/api/v1/shipments/{$shipment->id}/destination", [
        'destination_recipient_name' => 'Jane Doe',
        'destination_phone' => '01700000000',
        'destination_address_line1' => 'House 1',
        'destination_city' => 'Dhaka',
        'destination_country_code' => 'BD',
        'weight_grams' => 800,
        'expected_version' => 4,
    ])->assertOk();

    $response = $this->actingAs($packer, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/pack/complete", ['expected_version' => 5]);
    $response->assertOk()->assertJsonPath('data.status', 'packed');

    $response = $this->actingAs($dispatcher, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/dispatch", [
        'tracking_number' => 'TRK-MANUAL-99',
        'expected_version' => 6,
    ]);
    $response->assertOk()
        ->assertJsonPath('data.status', 'dispatched')
        ->assertJsonPath('data.trackingNumber', 'TRK-MANUAL-99');

    $response = $this->actingAs($dispatcher, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/in-transit", ['expected_version' => 7]);
    $response->assertOk()->assertJsonPath('data.status', 'in_transit');

    $response = $this->actingAs($dispatcher, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/deliver", ['expected_version' => 8]);
    $response->assertOk()->assertJsonPath('data.status', 'delivered');

    $shipment->refresh();
    expect($shipment->timelineEvents()->count())->toBeGreaterThanOrEqual(6);
});

it('marks a shipment failed with a reason', function () {
    $caller = userWithPermissions(['fulfillment.shipments.cancel']);
    $shipment = Shipment::factory()->picking()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/fail", [
        'reason' => 'Item damaged in warehouse.',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'failed')->assertJsonPath('data.failureReason', 'Item damaged in warehouse.');
});

it('cancels a pending shipment', function () {
    $caller = userWithPermissions(['fulfillment.shipments.cancel']);
    $shipment = Shipment::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/cancel", [
        'reason' => 'Customer requested cancellation.',
        'expected_version' => 1,
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'cancelled');
});

it('refuses to cancel a dispatched shipment', function () {
    $caller = userWithPermissions(['fulfillment.shipments.cancel']);
    $shipment = Shipment::factory()->dispatched()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/shipments/{$shipment->id}/cancel", ['expected_version' => $shipment->lock_version])
        ->assertStatus(422);
});

it('rejects a stale expected_version on a workflow transition as a 409 conflict', function () {
    $caller = userWithPermissions(['fulfillment.shipments.pick']);
    $shipment = Shipment::factory()->create();
    ShipmentItem::factory()->create(['shipment_id' => $shipment->id]);
    $shipment->update(['order_number' => 'ORD-changed']);

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/shipments/{$shipment->id}/pick/start", ['expected_version' => 1])
        ->assertStatus(409);
});
