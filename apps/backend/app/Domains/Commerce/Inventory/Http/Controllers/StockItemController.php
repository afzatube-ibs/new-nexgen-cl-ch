<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Actions\AdjustStockAction;
use App\Domains\Commerce\Inventory\Actions\ReserveStockAction;
use App\Domains\Commerce\Inventory\Http\Requests\AdjustStockRequest;
use App\Domains\Commerce\Inventory\Http\Requests\ReserveStockRequest;
use App\Domains\Commerce\Inventory\Http\Resources\StockAdjustmentResource;
use App\Domains\Commerce\Inventory\Http\Resources\StockItemResource;
use App\Domains\Commerce\Inventory\Http\Resources\StockReservationResource;
use App\Domains\Commerce\Inventory\Models\StockItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class StockItemController
{
    public function __construct(
        private readonly AdjustStockAction $adjustStockAction,
        private readonly ReserveStockAction $reserveStockAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StockItem::query()->orderBy('sku');

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->string('warehouse_id')->toString());
        }

        if ($request->filled('sku')) {
            $query->where('sku', $request->string('sku')->toString());
        }

        return StockItemResource::collection($query->paginate());
    }

    public function show(StockItem $stockItem): StockItemResource
    {
        return new StockItemResource($stockItem);
    }

    public function adjust(AdjustStockRequest $request): JsonResponse
    {
        $stockItem = $this->adjustStockAction->execute(
            warehouseId: $request->string('warehouse_id')->toString(),
            sku: $request->string('sku')->toString(),
            quantityDelta: (int) $request->integer('quantity_delta'),
            reason: $request->string('reason')->toString(),
            actorId: $request->user()?->id,
        );

        return (new StockItemResource($stockItem))->response()->setStatusCode(201);
    }

    public function adjustments(StockItem $stockItem): AnonymousResourceCollection
    {
        return StockAdjustmentResource::collection(
            $stockItem->adjustments()->orderByDesc('created_at')->paginate()
        );
    }

    public function reserve(ReserveStockRequest $request, StockItem $stockItem): JsonResponse
    {
        $reservation = $this->reserveStockAction->execute(
            stockItemId: $stockItem->id,
            quantity: (int) $request->integer('quantity'),
            referenceType: $request->string('reference_type')->toString() ?: null,
            referenceId: $request->string('reference_id')->toString() ?: null,
            actorId: $request->user()?->id,
        );

        return (new StockReservationResource($reservation))->response()->setStatusCode(201);
    }

    public function reservations(StockItem $stockItem): AnonymousResourceCollection
    {
        return StockReservationResource::collection(
            $stockItem->reservations()->orderByDesc('created_at')->paginate()
        );
    }
}
