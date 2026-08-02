<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\SetProductAttributeValuesAction;
use App\Domains\Commerce\Catalog\Http\Requests\SetProductAttributeValuesRequest;
use App\Domains\Commerce\Catalog\Http\Resources\ProductResource;
use App\Domains\Commerce\Catalog\Models\Product;

final class ProductAttributeValueController
{
    public function __construct(private readonly SetProductAttributeValuesAction $setProductAttributeValuesAction) {}

    public function update(SetProductAttributeValuesRequest $request, Product $product): ProductResource
    {
        $updated = $this->setProductAttributeValuesAction->execute(
            product: $product,
            values: $request->input('values', []),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new ProductResource($updated->load('attributeValues.attribute'));
    }
}
