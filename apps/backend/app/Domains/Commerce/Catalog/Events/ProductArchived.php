<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a Product transitions to `archived` — per
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Catalog entry event list.
 * A future Search module removing the product from its index, and a
 * future Checkout module refusing new carts for it, both react to this
 * rather than polling Product::status.
 */
final class ProductArchived extends DomainEvent
{
    public function __construct(
        public readonly string $productId,
        public readonly string $sku,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'catalog.product.archived';
    }
}
