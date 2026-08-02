<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a new ProductVariant is added to a `configurable`
 * Product, per planning/IMPLEMENTATION_MASTER_PLAN.md's Catalog entry
 * event list. The future Inventory module's primary trigger to create a
 * stock record for the new SKU.
 */
final class VariantAdded extends DomainEvent
{
    public function __construct(
        public readonly string $productId,
        public readonly string $variantId,
        public readonly string $sku,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'catalog.variant.added';
    }
}
