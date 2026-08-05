<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Models\Shipment;

it('denies adding a note without the manage permission', function () {
    $caller = userWithPermissions([]);
    $shipment = Shipment::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->postJson("/api/v1/shipments/{$shipment->id}/notes", ['body' => 'Handle with care'])
        ->assertStatus(403);
});

it('adds a note to a shipment and records a timeline entry', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);
    $shipment = Shipment::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->postJson("/api/v1/shipments/{$shipment->id}/notes", [
        'body' => 'Customer requested gift wrap.',
        'is_customer_visible' => true,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.body', 'Customer requested gift wrap.')
        ->assertJsonPath('data.isCustomerVisible', true);

    expect($shipment->timelineEvents()->where('event_type', 'note_added')->count())->toBe(1);
});
