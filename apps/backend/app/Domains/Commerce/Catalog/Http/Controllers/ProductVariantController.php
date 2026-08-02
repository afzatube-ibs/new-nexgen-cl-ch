<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\AddProductVariantAction;
use App\Domains\Commerce\Catalog\Actions\ArchiveProductVariantAction;
use App\Domains\Commerce\Catalog\Actions\DeleteProductVariantAction;
use App\Domains\Commerce\Catalog\Actions\UpdateProductVariantAction;
use App\Domains\Commerce\Catalog\Http\Requests\AddProductVariantRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateProductVariantRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductVariantResource;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ProductVariantController
{
    public function __construct(
        private readonly AddProductVariantAction $addProductVariantAction,
        private readonly UpdateProductVariantAction $updateProductVariantAction,
        private readonly ArchiveProductVariantAction $archiveProductVariantAction,
        private readonly DeleteProductVariantAction $deleteProductVariantAction,
    ) {}

    public function index(Product $product): AnonymousResourceCollection
    {
        return ProductVariantResource::collection(
            $product->variants()->with('optionValues')->orderBy('position')->get()
        );
    }

    public function store(AddProductVariantRequest $request, Product $product): JsonResponse
    {
        $variant = $this->addProductVariantAction->execute(
            product: $product,
            attributes: $request->safe()->except('option_value_ids'),
            optionValueIds: $request->input('option_value_ids', []),
            actorId: $request->user()?->id,
        );

        return (new ProductVariantResource($variant))->response()->setStatusCode(201);
    }

    public function update(UpdateProductVariantRequest $request, Product $product, ProductVariant $variant): ProductVariantResource
    {
        $updated = $this->updateProductVariantAction->execute(
            variant: $variant,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ProductVariantResource($updated->load('optionValues'));
    }

    public function archive(ExpectedVersionRequest $request, Product $product, ProductVariant $variant): ProductVariantResource
    {
        $archived = $this->archiveProductVariantAction->execute(
            $variant,
            (int) $request->integer('expected_version'),
            $request->user()?->id,
        );

        return new ProductVariantResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Product $product, ProductVariant $variant): Response
    {
        $this->deleteProductVariantAction->execute($variant, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }
}
