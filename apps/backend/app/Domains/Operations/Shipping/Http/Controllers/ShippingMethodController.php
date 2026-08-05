<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Controllers;

use App\Domains\Operations\Shipping\Actions\ArchiveShippingMethodAction;
use App\Domains\Operations\Shipping\Actions\CreateShippingMethodAction;
use App\Domains\Operations\Shipping\Actions\DeleteShippingMethodAction;
use App\Domains\Operations\Shipping\Actions\UpdateShippingMethodAction;
use App\Domains\Operations\Shipping\Http\Requests\CreateShippingMethodRequest;
use App\Domains\Operations\Shipping\Http\Requests\ExpectedVersionRequest;
use App\Domains\Operations\Shipping\Http\Requests\UpdateShippingMethodRequest;
use App\Domains\Operations\Shipping\Http\Resources\ShippingMethodResource;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ShippingMethodController
{
    public function __construct(
        private readonly CreateShippingMethodAction $createShippingMethodAction,
        private readonly UpdateShippingMethodAction $updateShippingMethodAction,
        private readonly ArchiveShippingMethodAction $archiveShippingMethodAction,
        private readonly DeleteShippingMethodAction $deleteShippingMethodAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ShippingMethod::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return ShippingMethodResource::collection($query->orderBy('name')->paginate());
    }

    public function show(ShippingMethod $shippingMethod): ShippingMethodResource
    {
        return new ShippingMethodResource($shippingMethod);
    }

    public function store(CreateShippingMethodRequest $request): JsonResponse
    {
        $method = $this->createShippingMethodAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new ShippingMethodResource($method))->response()->setStatusCode(201);
    }

    public function update(UpdateShippingMethodRequest $request, ShippingMethod $shippingMethod): ShippingMethodResource
    {
        $updated = $this->updateShippingMethodAction->execute(
            method: $shippingMethod,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShippingMethodResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, ShippingMethod $shippingMethod): ShippingMethodResource
    {
        $archived = $this->archiveShippingMethodAction->execute(
            method: $shippingMethod,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ShippingMethodResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, ShippingMethod $shippingMethod): Response
    {
        $this->deleteShippingMethodAction->execute(
            method: $shippingMethod,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
