<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Actions\ArchiveWarehouseAction;
use App\Domains\Commerce\Inventory\Actions\CreateWarehouseAction;
use App\Domains\Commerce\Inventory\Actions\DeleteWarehouseAction;
use App\Domains\Commerce\Inventory\Actions\RestoreWarehouseAction;
use App\Domains\Commerce\Inventory\Actions\UpdateWarehouseAction;
use App\Domains\Commerce\Inventory\Http\Requests\CreateWarehouseRequest;
use App\Domains\Commerce\Inventory\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Inventory\Http\Requests\UpdateWarehouseRequest;
use App\Domains\Commerce\Inventory\Http\Resources\WarehouseResource;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class WarehouseController
{
    public function __construct(
        private readonly CreateWarehouseAction $createWarehouseAction,
        private readonly UpdateWarehouseAction $updateWarehouseAction,
        private readonly ArchiveWarehouseAction $archiveWarehouseAction,
        private readonly DeleteWarehouseAction $deleteWarehouseAction,
        private readonly RestoreWarehouseAction $restoreWarehouseAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Warehouse::query()->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return WarehouseResource::collection($query->paginate());
    }

    public function show(Warehouse $warehouse): WarehouseResource
    {
        return new WarehouseResource($warehouse);
    }

    public function store(CreateWarehouseRequest $request): JsonResponse
    {
        $warehouse = $this->createWarehouseAction->execute($request->validated(), $request->user()?->id);

        return (new WarehouseResource($warehouse))->response()->setStatusCode(201);
    }

    public function update(UpdateWarehouseRequest $request, Warehouse $warehouse): WarehouseResource
    {
        $updated = $this->updateWarehouseAction->execute(
            warehouse: $warehouse,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new WarehouseResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Warehouse $warehouse): WarehouseResource
    {
        $archived = $this->archiveWarehouseAction->execute(
            $warehouse,
            (int) $request->integer('expected_version'),
            $request->user()?->id,
        );

        return new WarehouseResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Warehouse $warehouse): Response
    {
        $this->deleteWarehouseAction->execute($warehouse, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $warehouse): WarehouseResource
    {
        $model = Warehouse::withTrashed()->findOrFail($warehouse);
        $restored = $this->restoreWarehouseAction->execute($model, $request->user()?->id);

        return new WarehouseResource($restored);
    }
}
