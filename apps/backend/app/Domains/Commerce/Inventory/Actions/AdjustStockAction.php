<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Events\StockAdjusted;
use App\Domains\Commerce\Inventory\Exceptions\InsufficientStockException;
use App\Domains\Commerce\Inventory\Models\StockAdjustment;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * The single path by which `quantity_on_hand` ever changes for a manual/
 * external reason (receiving stock, a stocktake correction, damage
 * write-off). Locks the StockItem row for the duration of the check-and-
 * write (`lockForUpdate`) rather than relying on DATA:VERSIONING's
 * optimistic check: concurrent adjustments to the same StockItem are
 * expected and should serialize, not reject each other, unlike a human
 * editing a form.
 */
final readonly class AdjustStockAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(string $warehouseId, string $sku, int $quantityDelta, string $reason, ?string $actorId): StockItem
    {
        return DB::transaction(function () use ($warehouseId, $sku, $quantityDelta, $reason, $actorId) {
            $stockItem = StockItem::query()
                ->where('warehouse_id', $warehouseId)
                ->where('sku', $sku)
                ->lockForUpdate()
                ->first();

            if ($stockItem === null) {
                $stockItem = StockItem::query()->create([
                    'warehouse_id' => $warehouseId,
                    'sku' => $sku,
                ]);
            }

            $newQuantity = $stockItem->quantity_on_hand + $quantityDelta;

            if ($newQuantity < 0) {
                throw new InsufficientStockException($stockItem->id, $stockItem->available(), abs($quantityDelta));
            }

            $stockItem->quantity_on_hand = $newQuantity;
            $stockItem->save();

            StockAdjustment::query()->create([
                'stock_item_id' => $stockItem->id,
                'quantity_delta' => $quantityDelta,
                'reason' => $reason,
                'actor_id' => $actorId,
            ]);

            $this->auditLogger->log(
                action: 'stock.adjusted',
                actorId: $actorId,
                targetType: StockItem::class,
                targetId: $stockItem->id,
                after: ['quantity_delta' => $quantityDelta, 'reason' => $reason, 'quantity_on_hand' => $stockItem->quantity_on_hand],
            );

            $this->eventBus->publish(new StockAdjusted(
                stockItemId: $stockItem->id,
                sku: $stockItem->sku,
                warehouseId: $stockItem->warehouse_id,
                quantityOnHand: $stockItem->quantity_on_hand,
            ));

            return $stockItem;
        });
    }
}
