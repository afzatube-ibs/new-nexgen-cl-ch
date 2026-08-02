<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\CreateTagAction;
use App\Domains\Commerce\Catalog\Actions\DeleteTagAction;
use App\Domains\Commerce\Catalog\Actions\RestoreTagAction;
use App\Domains\Commerce\Catalog\Actions\UpdateTagAction;
use App\Domains\Commerce\Catalog\Http\Requests\CreateTagRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateTagRequest;
use App\Domains\Commerce\Catalog\Http\Resources\TagResource;
use App\Domains\Commerce\Catalog\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class TagController
{
    public function __construct(
        private readonly CreateTagAction $createTagAction,
        private readonly UpdateTagAction $updateTagAction,
        private readonly DeleteTagAction $deleteTagAction,
        private readonly RestoreTagAction $restoreTagAction,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        return TagResource::collection(Tag::query()->orderBy('name')->paginate());
    }

    public function show(Tag $tag): TagResource
    {
        return new TagResource($tag);
    }

    public function store(CreateTagRequest $request): JsonResponse
    {
        $tag = $this->createTagAction->execute($request->validated(), $request->user()?->id);

        return (new TagResource($tag))->response()->setStatusCode(201);
    }

    public function update(UpdateTagRequest $request, Tag $tag): TagResource
    {
        $updated = $this->updateTagAction->execute(
            tag: $tag,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new TagResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, Tag $tag): Response
    {
        $this->deleteTagAction->execute($tag, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $tag): TagResource
    {
        $model = Tag::withTrashed()->findOrFail($tag);
        $restored = $this->restoreTagAction->execute($model, $request->user()?->id);

        return new TagResource($restored);
    }
}
