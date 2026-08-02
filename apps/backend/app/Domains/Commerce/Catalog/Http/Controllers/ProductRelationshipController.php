<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\AddProductRelationshipAction;
use App\Domains\Commerce\Catalog\Actions\RemoveProductRelationshipAction;
use App\Domains\Commerce\Catalog\Http\Requests\AddProductRelationshipRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductRelationshipResource;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductRelationship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ProductRelationshipController
{
    public function __construct(
        private readonly AddProductRelationshipAction $addProductRelationshipAction,
        private readonly RemoveProductRelationshipAction $removeProductRelationshipAction,
    ) {}

    public function index(Product $product): AnonymousResourceCollection
    {
        return ProductRelationshipResource::collection($product->relationships()->orderBy('position')->get());
    }

    public function store(AddProductRelationshipRequest $request, Product $product): JsonResponse
    {
        $relationship = $this->addProductRelationshipAction->execute(
            product: $product,
            relatedProductId: $request->string('related_product_id')->toString(),
            type: $request->string('type')->toString(),
            actorId: $request->user()?->id,
        );

        return (new ProductRelationshipResource($relationship))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Product $product, ProductRelationship $relationship): Response
    {
        $this->removeProductRelationshipAction->execute($product, $relationship, $request->user()?->id);

        return response()->noContent();
    }
}
