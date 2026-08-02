<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\SyncProductCollectionsAction;
use App\Domains\Commerce\Catalog\Http\Requests\SyncProductCollectionsRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductResource;
use App\Domains\Commerce\Catalog\Models\Product;

final class ProductCollectionAssignmentController
{
    public function __construct(private readonly SyncProductCollectionsAction $syncProductCollectionsAction) {}

    public function update(SyncProductCollectionsRequest $request, Product $product): ProductResource
    {
        $updated = $this->syncProductCollectionsAction->execute(
            product: $product,
            collectionIds: $request->input('collection_ids', []),
            actorId: $request->user()?->id,
        );

        return new ProductResource($updated);
    }
}
