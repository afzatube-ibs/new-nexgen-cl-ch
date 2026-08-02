<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a Product's own fields change via
 * Actions\UpdateProductAction or Actions\PublishProductAction — the
 * canonical trigger for a future Search module to reindex, per
 * DATA:SEARCH_INDEXING's "the owning module is responsible for keeping its
 * own search index current." Deliberately not published for changes to a
 * Product's categories/tags/collections/images/attribute values/
 * relationships — those are separate, lower-signal associations; firing
 * this event only for genuine field changes keeps it meaningful rather
 * than noisy.
 */
final class ProductUpdated extends DomainEvent
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
        return 'catalog.product.updated';
    }
}
