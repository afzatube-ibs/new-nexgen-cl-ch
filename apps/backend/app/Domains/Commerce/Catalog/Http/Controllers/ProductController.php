<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\ArchiveProductAction;
use App\Domains\Commerce\Catalog\Actions\CreateProductAction;
use App\Domains\Commerce\Catalog\Actions\DeleteProductAction;
use App\Domains\Commerce\Catalog\Actions\PublishProductAction;
use App\Domains\Commerce\Catalog\Actions\RestoreProductAction;
use App\Domains\Commerce\Catalog\Actions\UpdateProductAction;
use App\Domains\Commerce\Catalog\Http\Requests\CreateProductRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateProductRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductResource;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ProductController
{
    private const array EAGER_LOAD = [
        'categories', 'collections', 'tags', 'images.media', 'variants.optionValues', 'attributeValues.attribute', 'relationships',
    ];

    public function __construct(
        private readonly CreateProductAction $createProductAction,
        private readonly UpdateProductAction $updateProductAction,
        private readonly PublishProductAction $publishProductAction,
        private readonly ArchiveProductAction $archiveProductAction,
        private readonly DeleteProductAction $deleteProductAction,
        private readonly RestoreProductAction $restoreProductAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        // Product list responses are customer-facing inputs to homepage,
        // category, brand and search-adjacent Storefront compositions. Keep
        // their relationship shape consistent with `show()` so primary media,
        // categories and variants are not silently dropped in list context.
        $query = Product::query()->with(self::EAGER_LOAD)->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('visibility')) {
            $query->where('visibility', $request->string('visibility')->toString());
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->string('brand_id')->toString());
        }

        if ($request->filled('category_id')) {
            $categoryId = $request->string('category_id')->toString();
            $query->whereHas('categories', fn ($q) => $q->where('categories.id', $categoryId));
        }

        // neXgen Production Sprint — Milestone 2 completion: the exact
        // same shape as the `category_id` filter directly above — a real,
        // additive completion of this module's own existing, real
        // Product<->Collection BelongsToMany (already eager-loaded via
        // self::EAGER_LOAD), never a new capability invented for this
        // filter's sake.
        if ($request->filled('collection_id')) {
            $collectionId = $request->string('collection_id')->toString();
            $query->whereHas('collections', fn ($q) => $q->where('collections.id', $collectionId));
        }

        if ($request->filled('search')) {
            $term = '%'.$request->string('search')->toString().'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('sku', 'like', $term));
        }

        $sort = $request->string('sort', 'name')->toString();
        $direction = $request->string('direction', 'asc')->toString() === 'desc' ? 'desc' : 'asc';
        if (in_array($sort, ['name', 'sku', 'created_at', 'published_at'], true)) {
            $query->reorder($sort, $direction);
        }

        return ProductResource::collection($query->paginate());
    }

    public function show(Product $product): ProductResource
    {
        return new ProductResource($product->load(self::EAGER_LOAD));
    }

    public function store(CreateProductRequest $request): JsonResponse
    {
        $product = $this->createProductAction->execute($request->validated(), $request->user()?->id);

        return (new ProductResource($product))->response()->setStatusCode(201);
    }

    public function update(UpdateProductRequest $request, Product $product): ProductResource
    {
        $updated = $this->updateProductAction->execute(
            product: $product,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ProductResource($updated->load(self::EAGER_LOAD));
    }

    public function publish(ExpectedVersionRequest $request, Product $product): ProductResource
    {
        $published = $this->publishProductAction->execute(
            $product,
            (int) $request->integer('expected_version'),
            $request->user()?->id,
        );

        return new ProductResource($published);
    }

    public function archive(ExpectedVersionRequest $request, Product $product): ProductResource
    {
        $archived = $this->archiveProductAction->execute(
            $product,
            (int) $request->integer('expected_version'),
            $request->user()?->id,
        );

        return new ProductResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Product $product): Response
    {
        $this->deleteProductAction->execute($product, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $product): ProductResource
    {
        $model = Product::withTrashed()->findOrFail($product);
        $restored = $this->restoreProductAction->execute($model, $request->user()?->id);

        return new ProductResource($restored);
    }
}
