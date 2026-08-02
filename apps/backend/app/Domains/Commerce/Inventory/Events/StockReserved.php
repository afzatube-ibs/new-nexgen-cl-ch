<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a reservation is placed against a StockItem — per
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Inventory entry event list.
 */
final class StockReserved extends DomainEvent
{
    public function __construct(
        public readonly string $stockItemId,
        public readonly string $reservationId,
        public readonly int $quantity,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'inventory.stock.reserved';
    }
}
