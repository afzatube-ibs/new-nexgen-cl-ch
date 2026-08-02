<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Resources;

use App\Domains\Commerce\Catalog\Models\ProductAttributeValue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductAttributeValue
 */
final class ProductAttributeValueResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'attributeId' => $this->attribute_id,
            'attributeCode' => $this->whenLoaded('attribute', fn () => $this->attribute?->code),
            'value' => $this->value,
        ];
    }
}
