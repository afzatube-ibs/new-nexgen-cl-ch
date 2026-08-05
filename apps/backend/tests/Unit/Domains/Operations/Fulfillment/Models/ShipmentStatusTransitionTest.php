<?php

declare(strict_types=1);

use App\Domains\Operations\Fulfillment\Exceptions\InvalidShipmentStatusTransitionException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('allows every step of the normal happy path', function () {
    $shipment = Shipment::factory()->create();

    $shipment->assertCanTransitionTo(Shipment::STATUS_PICKING);
    $shipment->status = Shipment::STATUS_PICKING;

    $shipment->assertCanTransitionTo(Shipment::STATUS_PICKED);
    $shipment->status = Shipment::STATUS_PICKED;

    $shipment->assertCanTransitionTo(Shipment::STATUS_PACKING);
    $shipment->status = Shipment::STATUS_PACKING;

    $shipment->assertCanTransitionTo(Shipment::STATUS_PACKED);
    $shipment->status = Shipment::STATUS_PACKED;

    $shipment->assertCanTransitionTo(Shipment::STATUS_DISPATCHED);
    $shipment->status = Shipment::STATUS_DISPATCHED;

    $shipment->assertCanTransitionTo(Shipment::STATUS_IN_TRANSIT);
    $shipment->status = Shipment::STATUS_IN_TRANSIT;

    $shipment->assertCanTransitionTo(Shipment::STATUS_DELIVERED);
})->throwsNoExceptions();

it('rejects skipping a step (pending straight to packed)', function () {
    $shipment = Shipment::factory()->create();

    expect(fn () => $shipment->assertCanTransitionTo(Shipment::STATUS_PACKED))
        ->toThrow(InvalidShipmentStatusTransitionException::class);
});

it('treats delivered, failed, and cancelled as terminal', function () {
    foreach ([Shipment::STATUS_DELIVERED, Shipment::STATUS_FAILED, Shipment::STATUS_CANCELLED] as $terminal) {
        $shipment = Shipment::factory()->create(['status' => $terminal]);

        expect(fn () => $shipment->assertCanTransitionTo(Shipment::STATUS_PICKING))
            ->toThrow(InvalidShipmentStatusTransitionException::class);
    }
});

it('allows cancellation from pending, picking, picked, packing, and packed', function () {
    foreach ([Shipment::STATUS_PENDING, Shipment::STATUS_PICKING, Shipment::STATUS_PICKED, Shipment::STATUS_PACKING, Shipment::STATUS_PACKED] as $status) {
        $shipment = Shipment::factory()->create(['status' => $status]);

        $shipment->assertCanTransitionTo(Shipment::STATUS_CANCELLED);
    }
})->throwsNoExceptions();

it('refuses cancellation once dispatched', function () {
    $shipment = Shipment::factory()->create(['status' => Shipment::STATUS_DISPATCHED]);

    expect(fn () => $shipment->assertCanTransitionTo(Shipment::STATUS_CANCELLED))
        ->toThrow(InvalidShipmentStatusTransitionException::class);
});

it('reports hasDestination() correctly', function () {
    $incomplete = Shipment::factory()->create();
    expect($incomplete->hasDestination())->toBeFalse();

    $complete = Shipment::factory()->withDestination()->create();
    expect($complete->hasDestination())->toBeTrue();
});
