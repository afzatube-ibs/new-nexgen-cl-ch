<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Resources;

use App\Domains\Commerce\Checkout\Support\ShippingOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShippingOption
 */
final class ShippingOptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'amount' => $this->amount,
        ];
    }
}
