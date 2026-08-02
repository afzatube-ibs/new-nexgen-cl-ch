<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\AddProductImageAction;
use App\Domains\Commerce\Catalog\Actions\RemoveProductImageAction;
use App\Domains\Commerce\Catalog\Actions\UpdateProductImageAction;
use App\Domains\Commerce\Catalog\Http\Requests\AddProductImageRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateProductImageRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductImageResource;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ProductImageController
{
    public function __construct(
        private readonly AddProductImageAction $addProductImageAction,
        private readonly UpdateProductImageAction $updateProductImageAction,
        private readonly RemoveProductImageAction $removeProductImageAction,
    ) {}

    public function index(Product $product): AnonymousResourceCollection
    {
        return ProductImageResource::collection($product->images()->with('media')->orderBy('position')->get());
    }

    public function store(AddProductImageRequest $request, Product $product): JsonResponse
    {
        $image = $this->addProductImageAction->execute($product, $request->validated(), $request->user()?->id);

        return (new ProductImageResource($image->load('media')))->response()->setStatusCode(201);
    }

    public function update(UpdateProductImageRequest $request, Product $product, ProductImage $image): ProductImageResource
    {
        $updated = $this->updateProductImageAction->execute($product, $image, $request->validated(), $request->user()?->id);

        return new ProductImageResource($updated->load('media'));
    }

    public function destroy(Request $request, Product $product, ProductImage $image): Response
    {
        $this->removeProductImageAction->execute($product, $image, $request->user()?->id);

        return response()->noContent();
    }
}
