<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published whenever a SKU's pricing within a PriceList is created or
 * changed — the one event planning/IMPLEMENTATION_MASTER_PLAN.md's
 * Pricing & Tax entry names. Carries the resolved effective price (the
 * current sale price if one is active, otherwise the base price), not
 * every raw column, per SECURITY:EVENT_SECURITY's "a subscriber receives
 * only what a publisher intended" — a subscriber needing the full pricing
 * record (compare-at price, schedule) queries this module's own public
 * contract for it. The future Checkout and Orders modules are this
 * event's anticipated subscribers, per this module's Public Contracts
 * entry in the master plan.
 */
final class PriceChanged extends DomainEvent
{
    public function __construct(
        public readonly string $priceListId,
        public readonly string $sku,
        public readonly string $currencyCode,
        public readonly string $effectivePrice,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'pricing.price.changed';
    }
}
