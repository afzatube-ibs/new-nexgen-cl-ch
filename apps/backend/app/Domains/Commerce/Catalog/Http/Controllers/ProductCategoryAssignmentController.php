<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\SyncProductCategoriesAction;
use App\Domains\Commerce\Catalog\Http\Requests\SyncProductCategoriesRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductResource;
use App\Domains\Commerce\Catalog\Models\Product;

final class ProductCategoryAssignmentController
{
    public function __construct(private readonly SyncProductCategoriesAction $syncProductCategoriesAction) {}

    public function update(SyncProductCategoriesRequest $request, Product $product): ProductResource
    {
        $updated = $this->syncProductCategoriesAction->execute(
            product: $product,
            categoryIds: $request->input('category_ids', []),
            actorId: $request->user()?->id,
        );

        return new ProductResource($updated);
    }
}
