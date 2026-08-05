<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Controllers;

use App\Domains\Operations\Shipping\Actions\ArchiveShippingRateAction;
use App\Domains\Operations\Shipping\Actions\CreateShippingRateAction;
use App\Domains\Operations\Shipping\Actions\DeleteShippingRateAction;
use App\Domains\Operations\Shipping\Actions\UpdateShippingRateAction;
use App\Domains\Operations\Shipping\Http\Requests\CreateShippingRateRequest;
use App\Domains\Operations\Shipping\Http\Requests\ExpectedVersionRequest;
use App\Domains\Operations\Shipping\Http\Requests\UpdateShippingRateRequest;
use App\Domains\Operations\Shipping\Http\Resources\ShippingRateResource;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ShippingRateController
{
    public function __construct(
        private readonly CreateShippingRateAction $createShippingRateAction,
        private readonly UpdateShippingRateAction $updateShippingRateAction,
        private readonly ArchiveShippingRateAction $archiveShippingRateAction,
        private readonly DeleteShippingRateAction $deleteShippingRateAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ShippingRate::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('shipping_zone_id')) {
            $query->where('shipping_zone_id', $request->string('shipping_zone_id')->toString());
        }

        if ($request->filled('shipping_method_id')) {
            $query->where('shipping_method_id', $request->string('shipping_method_id')->toString());
        }

        return ShippingRateResource::collection($query->orderBy('shipping_zone_id')->orderBy('min_weight_grams')->paginate());
    }

    public function show(ShippingRate $shippingRate): ShippingRateResource
    {
        return new ShippingRateResource($shippingRate);
    }

    public function store(CreateShippingRateRequest $request): JsonResponse
    {
        $rate = $this->createShippingRateAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new ShippingRateResource($rate))->response()->setStatusCode(201);
    }

    public function update(UpdateShippingRateRequest $request, ShippingRate $shippingRate): ShippingRateResource
    {
        $updated = $this->updateShippingRateAction->execute(
            rate: $shippingRate,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShippingRateResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, ShippingRate $shippingRate): ShippingRateResource
    {
        $archived = $this->archiveShippingRateAction->execute(
            rate: $shippingRate,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShippingRateResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, ShippingRate $shippingRate): Response
    {
        $this->deleteShippingRateAction->execute(
            rate: $shippingRate,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
