<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Events\StockAdjusted;
use App\Domains\Commerce\Inventory\Exceptions\InvalidTransferStateException;
use App\Domains\Commerce\Inventory\Models\StockAdjustment;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\StockReservation;
use App\Domains\Commerce\Inventory\Models\StockTransfer;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Moves the held quantity from the source warehouse's on-hand stock into
 * the destination warehouse's, creating the destination StockItem if this
 * is its first stock there.
 *
 * Both StockItem rows are locked together, ordered by `warehouse_id`
 * ascending rather than by "source then destination" — a transfer B->A
 * running concurrently with this A->B transfer would otherwise lock the
 * same two rows in the opposite order, a classic deadlock shape. Locking
 * in one fixed, direction-independent order for any given pair of
 * warehouses closes that window. The destination row's first-ever
 * creation (a plain insert, not a lock wait) has a narrow race window
 * against a second, equally-first transfer into the same new destination
 * SKU; this is accepted as a rare, documented edge case rather than
 * engineering full insert-retry handling for it in Phase 1.
 */
final readonly class CompleteStockTransferAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(StockTransfer $transfer, ?string $actorId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $actorId) {
            if ($transfer->status !== StockTransfer::STATUS_PENDING) {
                throw new InvalidTransferStateException($transfer->id, $transfer->status);
            }

            StockItem::query()->where('warehouse_id', $transfer->to_warehouse_id)
                ->where('sku', $transfer->sku)
                ->firstOrCreate(['warehouse_id' => $transfer->to_warehouse_id, 'sku' => $transfer->sku]);

            $stockItems = StockItem::query()
                ->whereIn('warehouse_id', [$transfer->from_warehouse_id, $transfer->to_warehouse_id])
                ->where('sku', $transfer->sku)
                ->orderBy('warehouse_id')
                ->lockForUpdate()
                ->get()
                ->keyBy('warehouse_id');

            $sourceItem = $stockItems->get($transfer->from_warehouse_id);
            $destinationItem = $stockItems->get($transfer->to_warehouse_id);

            if (! $sourceItem instanceof StockItem || ! $destinationItem instanceof StockItem) {
                throw new RuntimeException('Expected both stock transfer sides to have a stock item row.');
            }

            $sourceItem->quantity_on_hand -= $transfer->quantity;
            $sourceItem->quantity_reserved -= $transfer->quantity;
            $sourceItem->save();

            $destinationItem->quantity_on_hand += $transfer->quantity;
            $destinationItem->save();

            StockReservation::query()
                ->where('reference_type', StockTransfer::class)
                ->where('reference_id', $transfer->id)
                ->where('status', StockReservation::STATUS_ACTIVE)
                ->update(['status' => StockReservation::STATUS_COMMITTED]);

            StockAdjustment::query()->create([
                'stock_item_id' => $sourceItem->id,
                'quantity_delta' => -$transfer->quantity,
                'reason' => 'stock_transfer_out',
                'actor_id' => $actorId,
            ]);
            StockAdjustment::query()->create([
                'stock_item_id' => $destinationItem->id,
                'quantity_delta' => $transfer->quantity,
                'reason' => 'stock_transfer_in',
                'actor_id' => $actorId,
            ]);

            $transfer->status = StockTransfer::STATUS_COMPLETED;
            $transfer->save();

            $this->auditLogger->log(
                action: 'stock_transfer.completed',
                actorId: $actorId,
                targetType: StockTransfer::class,
                targetId: $transfer->id,
            );

            $this->eventBus->publish(new StockAdjusted($sourceItem->id, $sourceItem->sku, $sourceItem->warehouse_id, $sourceItem->quantity_on_hand));
            $this->eventBus->publish(new StockAdjusted($destinationItem->id, $destinationItem->sku, $destinationItem->warehouse_id, $destinationItem->quantity_on_hand));

            return $transfer;
        });
    }
}
