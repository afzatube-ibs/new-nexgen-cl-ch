<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Controllers;

use App\Domains\Operations\Fulfillment\Actions\AddShipmentItemAction;
use App\Domains\Operations\Fulfillment\Actions\RemoveShipmentItemAction;
use App\Domains\Operations\Fulfillment\Http\Requests\AddShipmentItemRequest;
use App\Domains\Operations\Fulfillment\Http\Resources\ShipmentItemResource;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class ShipmentItemController
{
    public function __construct(
        private readonly AddShipmentItemAction $addShipmentItemAction,
        private readonly RemoveShipmentItemAction $removeShipmentItemAction,
    ) {}

    public function store(AddShipmentItemRequest $request, Shipment $shipment): JsonResponse
    {
        $item = $this->addShipmentItemAction->execute(
            shipment: $shipment,
            sku: $request->string('sku')->toString(),
            description: $request->string('description')->toString() ?: null,
            quantity: (int) $request->integer('quantity'),
            actorId: $request->user()?->id,
        );

        return (new ShipmentItemResource($item))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Shipment $shipment, ShipmentItem $item): Response
    {
        $this->removeShipmentItemAction->execute(
            shipment: $shipment,
            item: $item,
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
