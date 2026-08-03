<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Resources;

use App\Domains\Commerce\Pricing\Models\PriceList;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PriceList
 */
final class PriceListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'currencyCode' => $this->currency_code,
            'isDefault' => $this->is_default,
            'status' => $this->status,
            'entries' => PriceListEntryResource::collection($this->whenLoaded('entries')),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
