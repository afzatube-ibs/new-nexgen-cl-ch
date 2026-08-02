<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\SyncProductOptionsAction;
use App\Domains\Commerce\Catalog\Http\Requests\SyncProductOptionsRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductResource;
use App\Domains\Commerce\Catalog\Models\Product;

final class ProductOptionAssignmentController
{
    public function __construct(private readonly SyncProductOptionsAction $syncProductOptionsAction) {}

    public function update(SyncProductOptionsRequest $request, Product $product): ProductResource
    {
        $updated = $this->syncProductOptionsAction->execute(
            product: $product,
            optionIds: $request->input('option_ids', []),
            actorId: $request->user()?->id,
        );

        return new ProductResource($updated);
    }
}
