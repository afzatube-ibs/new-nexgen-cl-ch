<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Resources;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps a Couriers\Contracts\ShippingProviderContract implementation, not
 * an Eloquent model — providers are code-and-config-defined, never
 * database rows (see the shipping_methods migration's docblock).
 *
 * @mixin ShippingProviderContract
 */
final class ShippingProviderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code(),
            'label' => $this->label(),
            'available' => $this->isAvailable(),
            'supportsLiveRateQuote' => $this->supportsLiveRateQuote(),
        ];
    }
}
