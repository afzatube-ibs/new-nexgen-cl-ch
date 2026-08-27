<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Resources;

use App\Domains\Operations\Shipping\Support\ShippingQuoteOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShippingQuoteOption
 */
final class ShippingQuoteOptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'shippingMethodId' => $this->shippingMethodId,
            'label' => $this->label,
            'shippingZoneId' => $this->shippingZoneId,
            'shippingRateId' => $this->shippingRateId,
            'weightGrams' => $this->weightGrams,
            'amount' => $this->amount,
            'currencyCode' => $this->currencyCode,
        ];
    }
}
