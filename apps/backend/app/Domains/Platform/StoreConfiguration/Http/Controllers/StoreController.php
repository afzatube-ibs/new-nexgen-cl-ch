<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Http\Controllers;

use App\Domains\Platform\StoreConfiguration\Actions\ArchiveStoreAction;
use App\Domains\Platform\StoreConfiguration\Actions\CreateStoreAction;
use App\Domains\Platform\StoreConfiguration\Actions\DeleteStoreAction;
use App\Domains\Platform\StoreConfiguration\Actions\UpdateStoreAction;
use App\Domains\Platform\StoreConfiguration\Http\Requests\CreateStoreRequest;
use App\Domains\Platform\StoreConfiguration\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\StoreConfiguration\Http\Requests\UpdateStoreRequest;
use App\Domains\Platform\StoreConfiguration\Http\Resources\StoreResource;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class StoreController
{
    public function __construct(
        private readonly CreateStoreAction $createStoreAction,
        private readonly UpdateStoreAction $updateStoreAction,
        private readonly ArchiveStoreAction $archiveStoreAction,
        private readonly DeleteStoreAction $deleteStoreAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Store::query()->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return StoreResource::collection($query->paginate());
    }

    public function show(Store $store): StoreResource
    {
        return new StoreResource($store);
    }

    public function store(CreateStoreRequest $request): JsonResponse
    {
        $store = $this->createStoreAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new StoreResource($store))->response()->setStatusCode(201);
    }

    public function update(UpdateStoreRequest $request, Store $store): StoreResource
    {
        $updated = $this->updateStoreAction->execute(
            store: $store,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new StoreResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Store $store): StoreResource
    {
        $archived = $this->archiveStoreAction->execute(
            store: $store,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new StoreResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Store $store): Response
    {
        $this->deleteStoreAction->execute(
            store: $store,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
