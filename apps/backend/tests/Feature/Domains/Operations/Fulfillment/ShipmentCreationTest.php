<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Audit\AuditLog;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use Illuminate\Support\Str;

function shipmentPayload(array $overrides = []): array
{
    return array_merge([
        'order_id' => (string) Str::uuid(),
        'order_number' => 'ORD-'.fake()->unique()->numerify('######'),
        'customer_id' => (string) Str::uuid(),
        'grand_total' => '150.0000',
        'currency_code' => 'BDT',
    ], $overrides);
}

it('denies listing shipments without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/shipments')
        ->assertStatus(403);
});

it('creates a shipment manually given the manage permission, auditing it and starting the timeline', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);

    $response = $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipments', shipmentPayload());

    $response->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.version', 1);

    $shipmentId = $response->json('data.id');
    expect(Shipment::query()->find($shipmentId))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'shipment.created')->count())->toBe(1);
});

it('rejects manual creation for an order that already has a shipment', function () {
    $caller = userWithPermissions(['fulfillment.shipments.manage']);
    $payload = shipmentPayload();

    $this->actingAs($caller, 'sanctum')->postJson('/api/v1/shipments', $payload)->assertCreated();

    $this->actingAs($caller, 'sanctum')
        ->postJson('/api/v1/shipments', $payload)
        ->assertStatus(422);
});

it('shows a shipment with its items, timeline, and notes loaded', function () {
    $caller = userWithPermissions(['fulfillment.shipments.view']);
    $shipment = Shipment::factory()->create();

    $response = $this->actingAs($caller, 'sanctum')->getJson("/api/v1/shipments/{$shipment->id}");

    $response->assertOk()->assertJsonStructure(['data' => ['id', 'items', 'timeline', 'notes']]);
});

it('filters the shipment list by status', function () {
    $caller = userWithPermissions(['fulfillment.shipments.view']);
    Shipment::factory()->create(['status' => Shipment::STATUS_PENDING]);
    Shipment::factory()->create(['status' => Shipment::STATUS_DELIVERED]);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/shipments?status=delivered');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('status')->unique()->all())->toBe(['delivered']);
});
