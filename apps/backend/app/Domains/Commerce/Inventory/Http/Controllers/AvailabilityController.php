<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only aggregate availability owned by Inventory. The Storefront
 * Gateway consumes the batch route so Catalog pages never need to infer
 * stock from publish state or issue one inventory query per product.
 */
final class AvailabilityController
{
    public function show(Request $request): JsonResponse
    {
        $request->validate(['sku' => ['required', 'string', 'max:100']]);
        $sku = $request->string('sku')->toString();
        $stockItems = $this->stockItemsForSkus([$sku]);

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

    public function index(Request $request): JsonResponse
    {
        $request->validate(['skus' => ['required', 'string', 'max:10000']]);

        $skus = collect(explode(',', $request->string('skus')->toString()))
            ->map(fn (string $sku) => trim($sku))
            ->filter(fn (string $sku) => $sku !== '')
            ->unique()
            ->take(100)
            ->values();

        if ($skus->isEmpty()) {
            return response()->json(['data' => []]);
        }

        /** @var list<string> $skuList */
        $skuList = array_values($skus->all());
        /** @var Collection<int, StockItem> $stockItems */
        $stockItems = $this->stockItemsForSkus($skuList);
        $grouped = $stockItems->groupBy('sku');

        return response()->json([
            'data' => $skus->map(fn (string $sku) => [
                'sku' => $sku,
                'totalAvailable' => $grouped->get($sku, collect())->sum(fn (StockItem $item) => $item->available()),
            ])->values(),
        ]);
    }

    /**
     * @param  list<string>  $skus
     * @return Collection<int, StockItem>
     */
    private function stockItemsForSkus(array $skus): Collection
    {
        return StockItem::query()
            ->whereIn('sku', $skus)
            ->whereHas('warehouse', fn ($query) => $query->where('status', Warehouse::STATUS_ACTIVE))
            ->with('warehouse')
            ->get();
    }
}
