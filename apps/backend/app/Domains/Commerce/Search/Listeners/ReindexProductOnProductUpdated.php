<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Listeners;

use App\Domains\Commerce\Catalog\Events\ProductUpdated;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Actions\IndexProductAction;
use Throwable;

/**
 * Search's reaction to Catalog's own `Actions\UpdateProductAction`/
 * `PublishProductAction` — see Listeners\ReindexProductOnProductCreated's
 * docblock for the shared same-domain-listener and try/catch-resilience
 * rationale, both identical here.
 */
final readonly class ReindexProductOnProductUpdated
{
    public function __construct(private IndexProductAction $indexProductAction) {}

    public function handle(ProductUpdated $event): void
    {
        try {
            $product = Product::query()->find($event->productId);

            if ($product === null) {
                return;
            }

            $this->indexProductAction->execute($product);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
