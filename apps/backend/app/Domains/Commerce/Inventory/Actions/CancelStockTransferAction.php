<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Events\StockReleased;
use App\Domains\Commerce\Inventory\Exceptions\InvalidTransferStateException;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\StockReservation;
use App\Domains\Commerce\Inventory\Models\StockTransfer;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Releases the source-side hold InitiateStockTransferAction placed,
 * without ever having touched the destination warehouse.
 */
final readonly class CancelStockTransferAction
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

            $reservation = StockReservation::query()
                ->where('reference_type', StockTransfer::class)
                ->where('reference_id', $transfer->id)
                ->where('status', StockReservation::STATUS_ACTIVE)
                ->first();

            if ($reservation !== null) {
                $sourceItem = StockItem::query()->lockForUpdate()->findOrFail($reservation->stock_item_id);
                $sourceItem->quantity_reserved -= $reservation->quantity;
                $sourceItem->save();

                $reservation->status = StockReservation::STATUS_RELEASED;
                $reservation->save();

                $this->eventBus->publish(new StockReleased($sourceItem->id, $reservation->id, $reservation->quantity));
            }

            $transfer->status = StockTransfer::STATUS_CANCELLED;
            $transfer->save();

            $this->auditLogger->log(
                action: 'stock_transfer.cancelled',
                actorId: $actorId,
                targetType: StockTransfer::class,
                targetId: $transfer->id,
            );

            return $transfer;
        });
    }
}
