<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Listeners;

use App\Domains\Commerce\Catalog\Events\ProductArchived;
use App\Domains\Commerce\Search\Actions\RemoveProductFromIndexAction;
use Throwable;

/**
 * Search's reaction to Catalog's own product archival — see Listeners\
 * ReindexProductOnProductCreated's docblock for the shared same-domain-
 * listener and try/catch-resilience rationale, both identical here.
 * Removes rather than re-indexes: an archived product has no reader
 * through Search at all, per Actions\IndexProductAction's own docblock.
 */
final readonly class RemoveProductFromIndexOnProductArchived
{
    public function __construct(private RemoveProductFromIndexAction $removeProductFromIndexAction) {}

    public function handle(ProductArchived $event): void
    {
        try {
            $this->removeProductFromIndexAction->execute($event->productId);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
