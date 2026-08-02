<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a new Product is created, per
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Catalog entry event list.
 * Carries only what a subscriber with no special relationship to Catalog
 * needs (SECURITY:EVENT_SECURITY) — future Search's index and future
 * Inventory's stock record both key off `sku`, so it travels here rather
 * than forcing every subscriber to query Catalog back for it.
 */
final class ProductCreated extends DomainEvent
{
    public function __construct(
        public readonly string $productId,
        public readonly string $sku,
        public readonly string $status,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'catalog.product.created';
    }
}
