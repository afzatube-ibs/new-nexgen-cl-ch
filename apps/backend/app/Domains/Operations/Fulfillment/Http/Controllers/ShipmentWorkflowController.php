<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Controllers;

use App\Domains\Operations\Fulfillment\Actions\CancelShipmentAction;
use App\Domains\Operations\Fulfillment\Actions\DispatchShipmentAction;
use App\Domains\Operations\Fulfillment\Actions\MarkDeliveredAction;
use App\Domains\Operations\Fulfillment\Actions\MarkFailedAction;
use App\Domains\Operations\Fulfillment\Actions\MarkInTransitAction;
use App\Domains\Operations\Fulfillment\Actions\MarkPackedAction;
use App\Domains\Operations\Fulfillment\Actions\MarkPickedAction;
use App\Domains\Operations\Fulfillment\Actions\SetShipmentDestinationAction;
use App\Domains\Operations\Fulfillment\Actions\StartPackingAction;
use App\Domains\Operations\Fulfillment\Actions\StartPickingAction;
use App\Domains\Operations\Fulfillment\Http\Requests\CancelShipmentRequest;
use App\Domains\Operations\Fulfillment\Http\Requests\DispatchShipmentRequest;
use App\Domains\Operations\Fulfillment\Http\Requests\ExpectedVersionRequest;
use App\Domains\Operations\Fulfillment\Http\Requests\MarkFailedRequest;
use App\Domains\Operations\Fulfillment\Http\Requests\SetShipmentDestinationRequest;
use App\Domains\Operations\Fulfillment\Http\Resources\ShipmentResource;
use App\Domains\Operations\Fulfillment\Models\Shipment;

/**
 * This module's Shipment Status Lifecycle, one HTTP action per transition
 * — mirrors Payments' PaymentActionController pattern (one controller
 * grouping every lifecycle-action endpoint for one aggregate) rather than
 * a controller per verb, since every method here shares the same resource
 * (Shipment) and the same "read the aggregate, delegate to one Action,
 * return the updated resource" shape.
 */
final class ShipmentWorkflowController
{
    public function __construct(
        private readonly SetShipmentDestinationAction $setShipmentDestinationAction,
        private readonly StartPickingAction $startPickingAction,
        private readonly MarkPickedAction $markPickedAction,
        private readonly StartPackingAction $startPackingAction,
        private readonly MarkPackedAction $markPackedAction,
        private readonly DispatchShipmentAction $dispatchShipmentAction,
        private readonly MarkInTransitAction $markInTransitAction,
        private readonly MarkDeliveredAction $markDeliveredAction,
        private readonly MarkFailedAction $markFailedAction,
        private readonly CancelShipmentAction $cancelShipmentAction,
    ) {}

    public function setDestination(SetShipmentDestinationRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->setShipmentDestinationAction->execute(
            shipment: $shipment,
            attributes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function startPicking(ExpectedVersionRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->startPickingAction->execute(
            shipment: $shipment,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function markPicked(ExpectedVersionRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->markPickedAction->execute(
            shipment: $shipment,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function startPacking(ExpectedVersionRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->startPackingAction->execute(
            shipment: $shipment,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function markPacked(ExpectedVersionRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->markPackedAction->execute(
            shipment: $shipment,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function dispatch(DispatchShipmentRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->dispatchShipmentAction->execute(
            shipment: $shipment,
            shippingMethodId: $request->string('shipping_method_id')->toString() ?: null,
            manualTrackingNumber: $request->string('tracking_number')->toString() ?: null,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function markInTransit(ExpectedVersionRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->markInTransitAction->execute(
            shipment: $shipment,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function markDelivered(ExpectedVersionRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->markDeliveredAction->execute(
            shipment: $shipment,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function markFailed(MarkFailedRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->markFailedAction->execute(
            shipment: $shipment,
            reason: $request->string('reason')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }

    public function cancel(CancelShipmentRequest $request, Shipment $shipment): ShipmentResource
    {
        $updated = $this->cancelShipmentAction->execute(
            shipment: $shipment,
            reason: $request->string('reason')->toString() ?: null,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShipmentResource($updated);
    }
}
