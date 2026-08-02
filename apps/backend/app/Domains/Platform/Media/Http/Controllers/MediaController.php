<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Http\Controllers;

use App\Domains\Platform\Media\Actions\DeleteMediaAction;
use App\Domains\Platform\Media\Actions\RestoreMediaAction;
use App\Domains\Platform\Media\Actions\UpdateMediaAltTextAction;
use App\Domains\Platform\Media\Actions\UploadMediaAction;
use App\Domains\Platform\Media\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\Media\Http\Requests\UpdateMediaAltTextRequest;
use App\Domains\Platform\Media\Http\Requests\UploadMediaRequest;
use App\Domains\Platform\Media\Http\Resources\MediaAssetResource;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class MediaController
{
    public function __construct(
        private readonly UploadMediaAction $uploadMediaAction,
        private readonly UpdateMediaAltTextAction $updateMediaAltTextAction,
        private readonly DeleteMediaAction $deleteMediaAction,
        private readonly RestoreMediaAction $restoreMediaAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = MediaAsset::query()->orderByDesc('created_at');

        if ($request->filled('mime_type')) {
            $query->where('mime_type', $request->string('mime_type')->toString());
        }

        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }

        return MediaAssetResource::collection($query->paginate());
    }

    public function show(MediaAsset $media): MediaAssetResource
    {
        return new MediaAssetResource($media);
    }

    public function store(UploadMediaRequest $request): JsonResponse
    {
        $asset = $this->uploadMediaAction->execute(
            file: $request->file('file'),
            altText: $request->string('alt_text')->toString() ?: null,
            actorId: $request->user()?->id,
        );

        return (new MediaAssetResource($asset))->response()->setStatusCode(201);
    }

    public function update(UpdateMediaAltTextRequest $request, MediaAsset $media): MediaAssetResource
    {
        $updated = $this->updateMediaAltTextAction->execute(
            asset: $media,
            altText: $request->string('alt_text')->toString() ?: null,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new MediaAssetResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, MediaAsset $media): Response
    {
        $this->deleteMediaAction->execute($media, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $id): MediaAssetResource
    {
        $asset = MediaAsset::withTrashed()->findOrFail($id);
        $restored = $this->restoreMediaAction->execute($asset, $request->user()?->id);

        return new MediaAssetResource($restored);
    }
}
