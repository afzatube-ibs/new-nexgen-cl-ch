<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Controllers;

use App\Domains\Operations\Fulfillment\Actions\CreateShipmentAction;
use App\Domains\Operations\Fulfillment\Http\Requests\CreateShipmentRequest;
use App\Domains\Operations\Fulfillment\Http\Resources\ShipmentResource;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ShipmentController
{
    public function __construct(private readonly CreateShipmentAction $createShipmentAction) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Shipment::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->string('order_id')->toString());
        }

        return ShipmentResource::collection($query->orderByDesc('created_at')->paginate());
    }

    public function show(Shipment $shipment): ShipmentResource
    {
        $shipment->load(['items', 'timelineEvents', 'notes']);

        return new ShipmentResource($shipment);
    }

    public function store(CreateShipmentRequest $request): JsonResponse
    {
        $shipment = $this->createShipmentAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new ShipmentResource($shipment))->response()->setStatusCode(201);
    }
}
