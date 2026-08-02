<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Exceptions\InsufficientStockException;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\StockTransfer;
use Illuminate\Support\Facades\DB;

/**
 * Starts a transfer by placing a hold (a StockReservation referencing this
 * transfer) against the source warehouse's stock — so the same units
 * cannot be sold out from under an in-progress transfer. The destination
 * warehouse is not touched until Actions\CompleteStockTransferAction runs.
 */
final readonly class InitiateStockTransferAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(string $fromWarehouseId, string $toWarehouseId, string $sku, int $quantity, ?string $actorId): StockTransfer
    {
        return DB::transaction(function () use ($fromWarehouseId, $toWarehouseId, $sku, $quantity, $actorId) {
            $sourceStockItem = StockItem::query()
                ->where('warehouse_id', $fromWarehouseId)
                ->where('sku', $sku)
                ->lockForUpdate()
                ->first();

            if ($sourceStockItem === null) {
                throw new InsufficientStockException($sku, 0, $quantity);
            }

            if ($sourceStockItem->available() < $quantity) {
                throw new InsufficientStockException($sourceStockItem->id, $sourceStockItem->available(), $quantity);
            }

            $transfer = StockTransfer::query()->create([
                'from_warehouse_id' => $fromWarehouseId,
                'to_warehouse_id' => $toWarehouseId,
                'sku' => $sku,
                'quantity' => $quantity,
            ]);

            $sourceStockItem->quantity_reserved += $quantity;
            $sourceStockItem->save();

            $sourceStockItem->reservations()->create([
                'quantity' => $quantity,
                'reference_type' => StockTransfer::class,
                'reference_id' => $transfer->id,
            ]);

            $this->auditLogger->log(
                action: 'stock_transfer.initiated',
                actorId: $actorId,
                targetType: StockTransfer::class,
                targetId: $transfer->id,
                after: $transfer->only(['from_warehouse_id', 'to_warehouse_id', 'sku', 'quantity']),
            );

            return $transfer;
        });
    }
}
