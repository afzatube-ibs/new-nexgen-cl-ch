<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Events\StockAdjusted;
use App\Domains\Commerce\Inventory\Exceptions\InvalidReservationStateException;
use App\Domains\Commerce\Inventory\Models\StockAdjustment;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\StockReservation;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Converts a held reservation into a permanent stock decrease — the
 * future Fulfillment module's trigger when an order for the reserved
 * quantity actually ships. Publishes StockAdjusted (the on-hand quantity
 * genuinely changed), never StockReleased (the hold is fulfilled, not
 * cancelled).
 */
final readonly class CommitReservationAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(StockReservation $reservation, ?string $actorId): StockReservation
    {
        return DB::transaction(function () use ($reservation, $actorId) {
            if (! $reservation->isActive()) {
                throw new InvalidReservationStateException($reservation->id, $reservation->status);
            }

            $stockItem = StockItem::query()->lockForUpdate()->findOrFail($reservation->stock_item_id);
            $stockItem->quantity_reserved -= $reservation->quantity;
            $stockItem->quantity_on_hand -= $reservation->quantity;
            $stockItem->save();

            $reservation->status = StockReservation::STATUS_COMMITTED;
            $reservation->save();

            StockAdjustment::query()->create([
                'stock_item_id' => $stockItem->id,
                'quantity_delta' => -$reservation->quantity,
                'reason' => 'reservation_committed',
                'actor_id' => $actorId,
            ]);

            $this->auditLogger->log(
                action: 'stock.reservation_committed',
                actorId: $actorId,
                targetType: StockItem::class,
                targetId: $stockItem->id,
                after: ['reservation_id' => $reservation->id, 'quantity' => $reservation->quantity],
            );

            $this->eventBus->publish(new StockAdjusted(
                stockItemId: $stockItem->id,
                sku: $stockItem->sku,
                warehouseId: $stockItem->warehouse_id,
                quantityOnHand: $stockItem->quantity_on_hand,
            ));

            return $reservation;
        });
    }
}
