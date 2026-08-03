<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Resources;

use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PriceListEntry
 */
final class PriceListEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'priceListId' => $this->price_list_id,
            'sku' => $this->sku,
            'basePrice' => $this->base_price,
            'compareAtPrice' => $this->compare_at_price,
            'salePrice' => $this->sale_price,
            'saleStartsAt' => $this->sale_starts_at?->toIso8601String(),
            'saleEndsAt' => $this->sale_ends_at?->toIso8601String(),
            'isSaleActive' => $this->isSaleActive(),
            'effectivePrice' => $this->effectivePrice(),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
