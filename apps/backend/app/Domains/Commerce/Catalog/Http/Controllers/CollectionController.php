<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\ArchiveCollectionAction;
use App\Domains\Commerce\Catalog\Actions\CreateCollectionAction;
use App\Domains\Commerce\Catalog\Actions\DeleteCollectionAction;
use App\Domains\Commerce\Catalog\Actions\RestoreCollectionAction;
use App\Domains\Commerce\Catalog\Actions\UpdateCollectionAction;
use App\Domains\Commerce\Catalog\Http\Requests\CreateCollectionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateCollectionRequest;
use App\Domains\Commerce\Catalog\Http\Resources\CollectionResource;
use App\Domains\Commerce\Catalog\Models\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CollectionController
{
    public function __construct(
        private readonly CreateCollectionAction $createCollectionAction,
        private readonly UpdateCollectionAction $updateCollectionAction,
        private readonly ArchiveCollectionAction $archiveCollectionAction,
        private readonly DeleteCollectionAction $deleteCollectionAction,
        private readonly RestoreCollectionAction $restoreCollectionAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Collection::query()->orderBy('position')->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return CollectionResource::collection($query->paginate());
    }

    public function show(Collection $collection): CollectionResource
    {
        return new CollectionResource($collection);
    }

    public function store(CreateCollectionRequest $request): JsonResponse
    {
        $collection = $this->createCollectionAction->execute($request->validated(), $request->user()?->id);

        return (new CollectionResource($collection))->response()->setStatusCode(201);
    }

    public function update(UpdateCollectionRequest $request, Collection $collection): CollectionResource
    {
        $updated = $this->updateCollectionAction->execute(
            collection: $collection,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CollectionResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Collection $collection): CollectionResource
    {
        $archived = $this->archiveCollectionAction->execute(
            $collection,
            (int) $request->integer('expected_version'),
            $request->user()?->id,
        );

        return new CollectionResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Collection $collection): Response
    {
        $this->deleteCollectionAction->execute($collection, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $collection): CollectionResource
    {
        $model = Collection::withTrashed()->findOrFail($collection);
        $restored = $this->restoreCollectionAction->execute($model, $request->user()?->id);

        return new CollectionResource($restored);
    }
}
