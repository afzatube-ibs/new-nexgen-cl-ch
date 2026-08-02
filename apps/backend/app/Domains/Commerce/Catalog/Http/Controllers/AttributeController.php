<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\CreateAttributeAction;
use App\Domains\Commerce\Catalog\Actions\DeleteAttributeAction;
use App\Domains\Commerce\Catalog\Actions\RestoreAttributeAction;
use App\Domains\Commerce\Catalog\Actions\UpdateAttributeAction;
use App\Domains\Commerce\Catalog\Http\Requests\CreateAttributeRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateAttributeRequest;
use App\Domains\Commerce\Catalog\Http\Resources\AttributeResource;
use App\Domains\Commerce\Catalog\Models\Attribute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class AttributeController
{
    public function __construct(
        private readonly CreateAttributeAction $createAttributeAction,
        private readonly UpdateAttributeAction $updateAttributeAction,
        private readonly DeleteAttributeAction $deleteAttributeAction,
        private readonly RestoreAttributeAction $restoreAttributeAction,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        return AttributeResource::collection(
            Attribute::query()->orderBy('position')->orderBy('name')->paginate()
        );
    }

    public function show(Attribute $attribute): AttributeResource
    {
        return new AttributeResource($attribute);
    }

    public function store(CreateAttributeRequest $request): JsonResponse
    {
        $attribute = $this->createAttributeAction->execute($request->validated(), $request->user()?->id);

        return (new AttributeResource($attribute))->response()->setStatusCode(201);
    }

    public function update(UpdateAttributeRequest $request, Attribute $attribute): AttributeResource
    {
        $updated = $this->updateAttributeAction->execute(
            attribute: $attribute,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new AttributeResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, Attribute $attribute): Response
    {
        $this->deleteAttributeAction->execute($attribute, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $attribute): AttributeResource
    {
        $model = Attribute::withTrashed()->findOrFail($attribute);
        $restored = $this->restoreAttributeAction->execute($model, $request->user()?->id);

        return new AttributeResource($restored);
    }
}
