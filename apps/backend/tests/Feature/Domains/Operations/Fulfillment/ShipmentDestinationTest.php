<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Models\Shipment;

function destinationPayload(array $overrides = []): array
{
    return array_merge([
        'destination_recipient_name' => 'Jane Doe',
        'destination_phone' => '01700000000',
        'destination_address_line1' => 'House 1, Road 2',
        'destination_city' => 'Dhaka',
        'destination_region' => 'Dhaka',
        'destination_postal_code' => '1207',
        'destination_country_code' => 'BD',
        'weight_grams' => 500,
        'expected_version' => 1,
    ], $overrides);
}

it('denies setting the destination without the manage permission', function () {
    $caller = userWithPermissions([]);
    $shipment = Shipment::factory()->create();

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/shipments/{$shipment->id}/destination", destinationPayload())
        ->assertStatus(403);
});

it('sets the destination on a shipment, auditing it', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);
    $shipment = Shipment::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->patchJson("/api/v1/shipments/{$shipment->id}/destination", destinationPayload());

    $response->assertOk()
        ->assertJsonPath('data.destination.recipientName', 'Jane Doe')
        ->assertJsonPath('data.destination.countryCode', 'BD')
        ->assertJsonPath('data.weightGrams', 500)
        ->assertJsonPath('data.version', 2);
});

it('rejects a stale expected_version as a 409 conflict', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);
    $shipment = Shipment::factory()->create();
    $shipment->update(['order_number' => 'ORD-changed']);

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/shipments/{$shipment->id}/destination", destinationPayload(['expected_version' => 1]))
        ->assertStatus(409);
});

it('refuses to change the destination once dispatched', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);
    $shipment = Shipment::factory()->dispatched()->create();

    $this->actingAs($caller, 'sanctum')
        ->patchJson("/api/v1/shipments/{$shipment->id}/destination", destinationPayload(['expected_version' => $shipment->lock_version]))
        ->assertStatus(422);
});
