<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Resources;

use App\Domains\Commerce\Orders\Models\OrderAddress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderAddress
 */
final class OrderAddressResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'addressType' => $this->address_type,
            'recipientName' => $this->recipient_name,
            'phone' => $this->phone,
            'addressLine1' => $this->address_line1,
            'addressLine2' => $this->address_line2,
            'city' => $this->city,
            'region' => $this->region,
            'postalCode' => $this->postal_code,
            'countryCode' => $this->country_code,
        ];
    }
}
