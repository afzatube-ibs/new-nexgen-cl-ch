<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Events\StockReserved;
use App\Domains\Commerce\Inventory\Exceptions\InsufficientStockException;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\StockReservation;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * The concrete mechanism behind the master plan's Inventory acceptance
 * criterion: "concurrent checkout reservations never oversell." The
 * StockItem row is locked (`lockForUpdate`) for the entire check-then-write,
 * so two concurrent reservations against the same item are serialized by
 * the database itself — the second transaction's lock acquisition simply
 * waits until the first commits, at which point it re-reads the now-
 * updated `quantity_reserved` before deciding whether stock remains.
 */
final readonly class ReserveStockAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(
        string $stockItemId,
        int $quantity,
        ?string $referenceType,
        ?string $referenceId,
        ?string $actorId,
    ): StockReservation {
        return DB::transaction(function () use ($stockItemId, $quantity, $referenceType, $referenceId, $actorId) {
            $stockItem = StockItem::query()->lockForUpdate()->findOrFail($stockItemId);

            if ($stockItem->available() < $quantity) {
                throw new InsufficientStockException($stockItem->id, $stockItem->available(), $quantity);
            }

            $stockItem->quantity_reserved += $quantity;
            $stockItem->save();

            $reservation = $stockItem->reservations()->create([
                'quantity' => $quantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
            ]);

            $this->auditLogger->log(
                action: 'stock.reserved',
                actorId: $actorId,
                targetType: StockItem::class,
                targetId: $stockItem->id,
                after: ['reservation_id' => $reservation->id, 'quantity' => $quantity],
            );

            $this->eventBus->publish(new StockReserved(
                stockItemId: $stockItem->id,
                reservationId: $reservation->id,
                quantity: $quantity,
            ));

            return $reservation;
        });
    }
}
