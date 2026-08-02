<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published whenever a StockItem's `quantity_on_hand` changes — manual
 * adjustment, reservation commit, or transfer completion — per
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Inventory entry event list.
 */
final class StockAdjusted extends DomainEvent
{
    public function __construct(
        public readonly string $stockItemId,
        public readonly string $sku,
        public readonly string $warehouseId,
        public readonly int $quantityOnHand,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'inventory.stock.adjusted';
    }
}
