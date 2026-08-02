<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Resources;

use App\Domains\Commerce\Inventory\Models\StockItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockItem
 */
final class StockItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'warehouseId' => $this->warehouse_id,
            'sku' => $this->sku,
            'quantityOnHand' => $this->quantity_on_hand,
            'quantityReserved' => $this->quantity_reserved,
            'quantityAvailable' => $this->available(),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
