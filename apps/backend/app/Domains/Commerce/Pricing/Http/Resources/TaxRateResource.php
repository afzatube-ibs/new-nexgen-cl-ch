<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Resources;

use App\Domains\Commerce\Pricing\Models\TaxRate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TaxRate
 */
final class TaxRateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'taxZoneId' => $this->tax_zone_id,
            'taxClassId' => $this->tax_class_id,
            'rate' => $this->rate,
            'status' => $this->status,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
