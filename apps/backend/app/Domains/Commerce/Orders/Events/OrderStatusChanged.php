<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by every status-transition action (ConfirmOrderAction,
 * StartProcessingOrderAction, ShipOrderAction, DeliverOrderAction,
 * CancelOrderAction) — the second event planning/IMPLEMENTATION_MASTER_
 * PLAN.md's Orders entry names, reused for every transition rather than
 * one event class per transition, since every subscriber cares about the
 * same shape: which order, what it was, what it is now.
 */
final class OrderStatusChanged extends DomainEvent
{
    public function __construct(
        public readonly string $orderId,
        public readonly string $fromStatus,
        public readonly string $toStatus,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'orders.order.status_changed';
    }
}
