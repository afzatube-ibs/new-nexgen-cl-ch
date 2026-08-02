<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The "Availability" requirement made concrete: a cross-warehouse view of
 * how much of a SKU can actually be promised right now, for a future
 * Checkout module to query without needing to understand warehouse
 * distribution itself.
 */
final class AvailabilityController
{
    public function show(Request $request): JsonResponse
    {
        $request->validate(['sku' => ['required', 'string', 'max:100']]);
        $sku = $request->string('sku')->toString();

        $stockItems = StockItem::query()
            ->where('sku', $sku)
            ->whereHas('warehouse', fn ($q) => $q->where('status', Warehouse::STATUS_ACTIVE))
            ->with('warehouse')
            ->get();

        $byWarehouse = $stockItems->map(fn (StockItem $item) => [
            'warehouseId' => $item->warehouse_id,
            'warehouseCode' => $item->warehouse?->code,
            'quantityOnHand' => $item->quantity_on_hand,
            'quantityReserved' => $item->quantity_reserved,
            'quantityAvailable' => $item->available(),
        ])->values();

        return response()->json([
            'data' => [
                'sku' => $sku,
                'totalAvailable' => $stockItems->sum(fn (StockItem $item) => $item->available()),
                'byWarehouse' => $byWarehouse,
            ],
        ]);
    }
}
