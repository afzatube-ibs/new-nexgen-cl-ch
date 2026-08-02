<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Resources;

use App\Domains\Commerce\Catalog\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductVariant
 */
final class ProductVariantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'status' => $this->status,
            'position' => $this->position,
            'optionValues' => OptionValueResource::collection($this->whenLoaded('optionValues')),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
