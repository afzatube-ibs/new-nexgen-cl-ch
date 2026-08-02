<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\CreateOptionAction;
use App\Domains\Commerce\Catalog\Actions\DeleteOptionAction;
use App\Domains\Commerce\Catalog\Actions\RestoreOptionAction;
use App\Domains\Commerce\Catalog\Actions\UpdateOptionAction;
use App\Domains\Commerce\Catalog\Http\Requests\CreateOptionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateOptionRequest;
use App\Domains\Commerce\Catalog\Http\Resources\OptionResource;
use App\Domains\Commerce\Catalog\Models\Option;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class OptionController
{
    public function __construct(
        private readonly CreateOptionAction $createOptionAction,
        private readonly UpdateOptionAction $updateOptionAction,
        private readonly DeleteOptionAction $deleteOptionAction,
        private readonly RestoreOptionAction $restoreOptionAction,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        return OptionResource::collection(
            Option::query()->with('values')->orderBy('position')->orderBy('name')->paginate()
        );
    }

    public function show(Option $option): OptionResource
    {
        return new OptionResource($option->load('values'));
    }

    public function store(CreateOptionRequest $request): JsonResponse
    {
        $option = $this->createOptionAction->execute($request->validated(), $request->user()?->id);

        return (new OptionResource($option))->response()->setStatusCode(201);
    }

    public function update(UpdateOptionRequest $request, Option $option): OptionResource
    {
        $updated = $this->updateOptionAction->execute(
            option: $option,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new OptionResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, Option $option): Response
    {
        $this->deleteOptionAction->execute($option, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $option): OptionResource
    {
        $model = Option::withTrashed()->findOrFail($option);
        $restored = $this->restoreOptionAction->execute($model, $request->user()?->id);

        return new OptionResource($restored);
    }
}
