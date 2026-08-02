<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Http\Resources;

use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Store
 */
final class StoreResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'legalName' => $this->legal_name,
            'currencyCode' => $this->currency_code,
            'locale' => $this->locale,
            'timezone' => $this->timezone,
            'contactEmail' => $this->contact_email,
            'contactPhone' => $this->contact_phone,
            'address' => [
                'line1' => $this->address_line1,
                'line2' => $this->address_line2,
                'city' => $this->city,
                'region' => $this->region,
                'postalCode' => $this->postal_code,
                'countryCode' => $this->country_code,
            ],
            'status' => $this->status,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
