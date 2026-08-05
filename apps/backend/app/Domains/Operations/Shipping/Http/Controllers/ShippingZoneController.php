<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Controllers;

use App\Domains\Operations\Shipping\Actions\ArchiveShippingZoneAction;
use App\Domains\Operations\Shipping\Actions\CreateShippingZoneAction;
use App\Domains\Operations\Shipping\Actions\DeleteShippingZoneAction;
use App\Domains\Operations\Shipping\Actions\UpdateShippingZoneAction;
use App\Domains\Operations\Shipping\Http\Requests\CreateShippingZoneRequest;
use App\Domains\Operations\Shipping\Http\Requests\ExpectedVersionRequest;
use App\Domains\Operations\Shipping\Http\Requests\UpdateShippingZoneRequest;
use App\Domains\Operations\Shipping\Http\Resources\ShippingZoneResource;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ShippingZoneController
{
    public function __construct(
        private readonly CreateShippingZoneAction $createShippingZoneAction,
        private readonly UpdateShippingZoneAction $updateShippingZoneAction,
        private readonly ArchiveShippingZoneAction $archiveShippingZoneAction,
        private readonly DeleteShippingZoneAction $deleteShippingZoneAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ShippingZone::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return ShippingZoneResource::collection($query->orderBy('country_code')->orderBy('region')->paginate());
    }

    public function show(ShippingZone $shippingZone): ShippingZoneResource
    {
        return new ShippingZoneResource($shippingZone);
    }

    public function store(CreateShippingZoneRequest $request): JsonResponse
    {
        $zone = $this->createShippingZoneAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new ShippingZoneResource($zone))->response()->setStatusCode(201);
    }

    public function update(UpdateShippingZoneRequest $request, ShippingZone $shippingZone): ShippingZoneResource
    {
        $updated = $this->updateShippingZoneAction->execute(
            zone: $shippingZone,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShippingZoneResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, ShippingZone $shippingZone): ShippingZoneResource
    {
        $archived = $this->archiveShippingZoneAction->execute(
            zone: $shippingZone,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShippingZoneResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, ShippingZone $shippingZone): Response
    {
        $this->deleteShippingZoneAction->execute(
            zone: $shippingZone,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
