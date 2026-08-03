<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Resources;

use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TaxZone
 */
final class TaxZoneResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'countryCode' => $this->country_code,
            'region' => $this->region,
            'status' => $this->status,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
