<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Http\Controllers;

use App\Domains\Platform\Localization\Actions\ArchiveLocaleAction;
use App\Domains\Platform\Localization\Actions\CreateLocaleAction;
use App\Domains\Platform\Localization\Actions\DeleteLocaleAction;
use App\Domains\Platform\Localization\Actions\UpdateLocaleAction;
use App\Domains\Platform\Localization\Http\Requests\CreateLocaleRequest;
use App\Domains\Platform\Localization\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\Localization\Http\Requests\UpdateLocaleRequest;
use App\Domains\Platform\Localization\Http\Resources\LocaleResource;
use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class LocaleController
{
    public function __construct(
        private readonly CreateLocaleAction $createLocaleAction,
        private readonly UpdateLocaleAction $updateLocaleAction,
        private readonly ArchiveLocaleAction $archiveLocaleAction,
        private readonly DeleteLocaleAction $deleteLocaleAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Locale::query()->orderBy('code');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return LocaleResource::collection($query->paginate());
    }

    public function show(Locale $locale): LocaleResource
    {
        return new LocaleResource($locale);
    }

    public function store(CreateLocaleRequest $request): JsonResponse
    {
        $locale = $this->createLocaleAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new LocaleResource($locale))->response()->setStatusCode(201);
    }

    public function update(UpdateLocaleRequest $request, Locale $locale): LocaleResource
    {
        $updated = $this->updateLocaleAction->execute(
            locale: $locale,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new LocaleResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Locale $locale): LocaleResource
    {
        $archived = $this->archiveLocaleAction->execute(
            locale: $locale,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new LocaleResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Locale $locale): Response
    {
        $this->deleteLocaleAction->execute(
            locale: $locale,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
