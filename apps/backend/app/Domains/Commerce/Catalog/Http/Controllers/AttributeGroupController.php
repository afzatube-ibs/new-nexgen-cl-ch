<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\CreateAttributeGroupAction;
use App\Domains\Commerce\Catalog\Actions\DeleteAttributeGroupAction;
use App\Domains\Commerce\Catalog\Actions\RestoreAttributeGroupAction;
use App\Domains\Commerce\Catalog\Actions\UpdateAttributeGroupAction;
use App\Domains\Commerce\Catalog\Http\Requests\CreateAttributeGroupRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateAttributeGroupRequest;
use App\Domains\Commerce\Catalog\Http\Resources\AttributeGroupResource;
use App\Domains\Commerce\Catalog\Models\AttributeGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class AttributeGroupController
{
    public function __construct(
        private readonly CreateAttributeGroupAction $createAttributeGroupAction,
        private readonly UpdateAttributeGroupAction $updateAttributeGroupAction,
        private readonly DeleteAttributeGroupAction $deleteAttributeGroupAction,
        private readonly RestoreAttributeGroupAction $restoreAttributeGroupAction,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        return AttributeGroupResource::collection(
            AttributeGroup::query()->orderBy('position')->orderBy('name')->paginate()
        );
    }

    public function show(AttributeGroup $attributeGroup): AttributeGroupResource
    {
        return new AttributeGroupResource($attributeGroup);
    }

    public function store(CreateAttributeGroupRequest $request): JsonResponse
    {
        $group = $this->createAttributeGroupAction->execute($request->validated(), $request->user()?->id);

        return (new AttributeGroupResource($group))->response()->setStatusCode(201);
    }

    public function update(UpdateAttributeGroupRequest $request, AttributeGroup $attributeGroup): AttributeGroupResource
    {
        $updated = $this->updateAttributeGroupAction->execute(
            group: $attributeGroup,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new AttributeGroupResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, AttributeGroup $attributeGroup): Response
    {
        $this->deleteAttributeGroupAction->execute($attributeGroup, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $attributeGroup): AttributeGroupResource
    {
        $model = AttributeGroup::withTrashed()->findOrFail($attributeGroup);
        $restored = $this->restoreAttributeGroupAction->execute($model, $request->user()?->id);

        return new AttributeGroupResource($restored);
    }
}
