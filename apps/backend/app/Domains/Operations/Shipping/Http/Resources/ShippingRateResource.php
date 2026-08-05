<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Resources;

use App\Domains\Operations\Shipping\Models\ShippingRate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShippingRate
 */
final class ShippingRateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'shippingZoneId' => $this->shipping_zone_id,
            'shippingMethodId' => $this->shipping_method_id,
            'minWeightGrams' => $this->min_weight_grams,
            'maxWeightGrams' => $this->max_weight_grams,
            'amount' => $this->amount,
            'currencyCode' => $this->currency_code,
            'status' => $this->status,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
