<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Http\Requests\AvailabilityManyRequest;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Inventory's availability contract. Inventory remains the only layer that
 * decides what is actually available: quantity on hand minus reserved stock,
 * across active warehouses only. Gateway callers receive the result; they do
 * not reimplement warehouse or reservation rules.
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

    /**
     * One query for an entire storefront product page/grid. Warehouse detail
     * deliberately stays private; the public composition only needs each
     * SKU's aggregate availability and Inventory-owned available/not-available
     * decision. Missing stock rows resolve to zero available, matching the
     * existing single-SKU contract.
     */
    public function many(AvailabilityManyRequest $request): JsonResponse
    {
        $skus = $request->skuList();

        if ($skus === []) {
            return response()->json(['data' => []]);
        }

        $stockItems = StockItem::query()
            ->whereIn('sku', $skus)
            ->whereHas('warehouse', fn ($q) => $q->where('status', Warehouse::STATUS_ACTIVE))
            ->get(['sku', 'quantity_on_hand', 'quantity_reserved']);

        $totals = [];
        foreach ($stockItems as $item) {
            $sku = strtoupper($item->sku);
            $totals[$sku] = ($totals[$sku] ?? 0) + $item->available();
        }

        $data = array_map(
            static function (string $sku) use ($totals): array {
                $totalAvailable = $totals[$sku] ?? 0;

                return [
                    'sku' => $sku,
                    'totalAvailable' => $totalAvailable,
                    'isAvailable' => $totalAvailable > 0,
                ];
            },
            $skus,
        );

        return response()->json(['data' => $data]);
    }
}
