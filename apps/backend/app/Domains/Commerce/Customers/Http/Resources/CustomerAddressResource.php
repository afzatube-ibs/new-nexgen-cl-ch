<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Resources;

use App\Domains\Commerce\Customers\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CustomerAddress
 */
final class CustomerAddressResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'recipientName' => $this->recipient_name,
            'phone' => $this->phone,
            'addressLine1' => $this->address_line1,
            'addressLine2' => $this->address_line2,
            'city' => $this->city,
            'region' => $this->region,
            'postalCode' => $this->postal_code,
            'countryCode' => $this->country_code,
            'isDefaultShipping' => $this->is_default_shipping,
            'isDefaultBilling' => $this->is_default_billing,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
