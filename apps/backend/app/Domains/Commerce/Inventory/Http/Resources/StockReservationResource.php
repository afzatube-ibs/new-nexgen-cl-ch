<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Resources;

use App\Domains\Commerce\Inventory\Models\StockReservation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockReservation
 */
final class StockReservationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'stockItemId' => $this->stock_item_id,
            'quantity' => $this->quantity,
            'referenceType' => $this->reference_type,
            'referenceId' => $this->reference_id,
            'status' => $this->status,
            'expiresAt' => $this->expires_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
