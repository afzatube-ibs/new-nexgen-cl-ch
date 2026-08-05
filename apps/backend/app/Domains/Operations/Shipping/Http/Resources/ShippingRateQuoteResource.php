<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Resources;

use App\Domains\Operations\Shipping\Support\ShippingRateCalculationResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps a plain Support\ShippingRateCalculationResult value object, not an
 * Eloquent model — mirrors Pricing's TaxCalculationResource exactly.
 *
 * @mixin ShippingRateCalculationResult
 */
final class ShippingRateQuoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'shippingMethodId' => $this->shippingMethodId,
            'shippingZoneId' => $this->shippingZoneId,
            'shippingRateId' => $this->shippingRateId,
            'weightGrams' => $this->weightGrams,
            'amount' => $this->amount,
            'currencyCode' => $this->currencyCode,
        ];
    }
}
