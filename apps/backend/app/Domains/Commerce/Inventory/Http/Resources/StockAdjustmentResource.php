<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Resources;

use App\Domains\Commerce\Inventory\Models\StockAdjustment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockAdjustment
 */
final class StockAdjustmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'stockItemId' => $this->stock_item_id,
            'quantityDelta' => $this->quantity_delta,
            'reason' => $this->reason,
            'actorId' => $this->actor_id,
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
