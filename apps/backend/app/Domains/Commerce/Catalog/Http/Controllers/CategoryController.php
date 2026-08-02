<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\ArchiveCategoryAction;
use App\Domains\Commerce\Catalog\Actions\CreateCategoryAction;
use App\Domains\Commerce\Catalog\Actions\DeleteCategoryAction;
use App\Domains\Commerce\Catalog\Actions\RestoreCategoryAction;
use App\Domains\Commerce\Catalog\Actions\UpdateCategoryAction;
use App\Domains\Commerce\Catalog\Http\Requests\CreateCategoryRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateCategoryRequest;
use App\Domains\Commerce\Catalog\Http\Resources\CategoryResource;
use App\Domains\Commerce\Catalog\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CategoryController
{
    public function __construct(
        private readonly CreateCategoryAction $createCategoryAction,
        private readonly UpdateCategoryAction $updateCategoryAction,
        private readonly ArchiveCategoryAction $archiveCategoryAction,
        private readonly DeleteCategoryAction $deleteCategoryAction,
        private readonly RestoreCategoryAction $restoreCategoryAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Category::query()->orderBy('position')->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->string('parent_id')->toString());
        }

        return CategoryResource::collection($query->paginate());
    }

    public function show(Category $category): CategoryResource
    {
        return new CategoryResource($category);
    }

    public function store(CreateCategoryRequest $request): JsonResponse
    {
        $category = $this->createCategoryAction->execute($request->validated(), $request->user()?->id);

        return (new CategoryResource($category))->response()->setStatusCode(201);
    }

    public function update(UpdateCategoryRequest $request, Category $category): CategoryResource
    {
        $updated = $this->updateCategoryAction->execute(
            category: $category,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new CategoryResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, Category $category): CategoryResource
    {
        $archived = $this->archiveCategoryAction->execute(
            $category,
            (int) $request->integer('expected_version'),
            $request->user()?->id,
        );

        return new CategoryResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Category $category): Response
    {
        $this->deleteCategoryAction->execute($category, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $category): CategoryResource
    {
        $model = Category::withTrashed()->findOrFail($category);
        $restored = $this->restoreCategoryAction->execute($model, $request->user()?->id);

        return new CategoryResource($restored);
    }
}
