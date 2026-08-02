<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\SyncProductTagsAction;
use App\Domains\Commerce\Catalog\Http\Requests\SyncProductTagsRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductResource;
use App\Domains\Commerce\Catalog\Models\Product;

final class ProductTagAssignmentController
{
    public function __construct(private readonly SyncProductTagsAction $syncProductTagsAction) {}

    public function update(SyncProductTagsRequest $request, Product $product): ProductResource
    {
        $updated = $this->syncProductTagsAction->execute(
            product: $product,
            tagIds: $request->input('tag_ids', []),
            actorId: $request->user()?->id,
        );

        return new ProductResource($updated);
    }
}
