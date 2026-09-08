<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Inventory owns the definition of sellable availability: on-hand minus
 * reserved stock, summed only across active warehouses. Gateway/storefront
 * callers consume this result and never reimplement warehouse arithmetic.
 */
final class AvailabilityController
{
    public function show(Request $request): JsonResponse
    {
        $request->validate(['sku' => ['required', 'string', 'max:100']]);
        $sku = $request->string('sku')->toString();

        $stockItems = $this->activeStockItems(collect([$sku]));
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
     * Batch companion for composition layers. It deliberately returns only
     * the SKU and aggregate available quantity — no warehouse internals —
     * and includes requested SKUs with zero rows as totalAvailable=0.
     */
    public function batch(Request $request): JsonResponse
    {
        $request->validate(['skus' => ['required', 'string', 'max:10000']]);

        $skus = collect(explode(',', $request->string('skus')->toString()))
            ->map(static fn (string $sku): string => trim($sku))
            ->filter(static fn (string $sku): bool => $sku !== '')
            ->unique()
            ->values();

        if ($skus->isEmpty()) {
            throw ValidationException::withMessages(['skus' => ['At least one SKU is required.']]);
        }

        if ($skus->count() > 100) {
            throw ValidationException::withMessages(['skus' => ['No more than 100 SKUs may be requested at once.']]);
        }

        /** @var Collection<int, StockItem> $stockItems */
        $stockItems = $this->activeStockItems($skus);
        $totals = $stockItems
            ->groupBy('sku')
            ->map(static fn (Collection $items): int => $items->sum(static fn (StockItem $item): int => $item->available()));

        return response()->json([
            'data' => $skus->map(static fn (string $sku): array => [
                'sku' => $sku,
                'totalAvailable' => (int) ($totals->get($sku) ?? 0),
            ])->values(),
        ]);
    }

    /**
     * @param  Collection<int, string>  $skus
     * @return Collection<int, StockItem>
     */
    private function activeStockItems(Collection $skus): Collection
    {
        return StockItem::query()
            ->whereIn('sku', $skus->all())
            ->whereHas('warehouse', fn ($query) => $query->where('status', Warehouse::STATUS_ACTIVE))
            ->with('warehouse')
            ->get();
    }
}
