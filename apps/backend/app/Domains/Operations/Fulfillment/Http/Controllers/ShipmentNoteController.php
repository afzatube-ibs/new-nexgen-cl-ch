<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Controllers;

use App\Domains\Operations\Fulfillment\Actions\AddShipmentNoteAction;
use App\Domains\Operations\Fulfillment\Http\Requests\AddShipmentNoteRequest;
use App\Domains\Operations\Fulfillment\Http\Resources\ShipmentNoteResource;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use Illuminate\Http\JsonResponse;

final class ShipmentNoteController
{
    public function __construct(private readonly AddShipmentNoteAction $addShipmentNoteAction) {}

    public function store(AddShipmentNoteRequest $request, Shipment $shipment): JsonResponse
    {
        $note = $this->addShipmentNoteAction->execute(
            shipment: $shipment,
            body: $request->string('body')->toString(),
            isCustomerVisible: $request->boolean('is_customer_visible'),
            actorId: $request->user()?->id,
        );

        return (new ShipmentNoteResource($note))->response()->setStatusCode(201);
    }
}
