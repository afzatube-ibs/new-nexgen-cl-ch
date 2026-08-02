<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Events\StockReleased;
use App\Domains\Commerce\Inventory\Exceptions\InvalidReservationStateException;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\StockReservation;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class ReleaseReservationAction
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
            $stockItem->save();

            $reservation->status = StockReservation::STATUS_RELEASED;
            $reservation->save();

            $this->auditLogger->log(
                action: 'stock.released',
                actorId: $actorId,
                targetType: StockItem::class,
                targetId: $stockItem->id,
                after: ['reservation_id' => $reservation->id, 'quantity' => $reservation->quantity],
            );

            $this->eventBus->publish(new StockReleased(
                stockItemId: $stockItem->id,
                reservationId: $reservation->id,
                quantity: $reservation->quantity,
            ));

            return $reservation;
        });
    }
}
