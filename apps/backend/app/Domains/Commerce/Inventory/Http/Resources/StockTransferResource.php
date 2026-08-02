<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Resources;

use App\Domains\Commerce\Inventory\Models\StockTransfer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockTransfer
 */
final class StockTransferResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fromWarehouseId' => $this->from_warehouse_id,
            'toWarehouseId' => $this->to_warehouse_id,
            'sku' => $this->sku,
            'quantity' => $this->quantity,
            'status' => $this->status,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
