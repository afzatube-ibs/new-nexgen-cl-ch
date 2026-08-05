<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published once, when Actions\CreateOrderAction successfully places an
 * order — the event planning/IMPLEMENTATION_MASTER_PLAN.md's Orders entry
 * names for order creation. Carries the identifiers and totals a
 * subscriber needs (e.g. a future Inventory reservation-confirmation
 * step, or a notification), not every raw column, per SECURITY:
 * EVENT_SECURITY's "a subscriber receives only what a publisher
 * intended."
 */
final class OrderPlaced extends DomainEvent
{
    public function __construct(
        public readonly string $orderId,
        public readonly string $orderNumber,
        public readonly string $customerId,
        public readonly string $grandTotal,
        public readonly string $currencyCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'orders.order.placed';
    }
}
