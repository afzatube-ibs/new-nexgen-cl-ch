<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Actions;

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Database\Eloquent\Collection;

/**
 * Console\Commands\ReindexCommand's only caller — the concrete proof of
 * DATA:SEARCH_INDEXING's acceptance criterion: "the search index can be
 * fully rebuilt from Catalog... data alone with zero information loss."
 *
 * Starts by clearing every existing row rather than only upserting live
 * products, so the result is fully deterministic and self-healing —
 * converging to exactly what Catalog's current data implies regardless
 * of any drift accumulated by a past bug, a missed event, or manual data
 * surgery, rather than merely refreshing rows already present.
 *
 * Reads Catalog's own `Product` table directly (same-domain,
 * Commerce-to-Commerce, per ARCH:DOMAIN_MAP — no cross-domain event
 * bus round-trip needed for a bulk read like this) in chunks, per
 * `config('search.reindex_chunk_size')`, to keep memory bounded on a
 * large catalog.
 */
final readonly class RebuildSearchIndexAction
{
    public function __construct(private IndexProductAction $indexProductAction) {}

    public function execute(): int
    {
        ProductSearchIndex::query()->delete();

        $indexed = 0;

        Product::query()
            ->with(['brand', 'categories'])
            ->where('status', '!=', Product::STATUS_ARCHIVED)
            ->chunkById(
                (int) config('search.reindex_chunk_size', 200),
                /**
                 * @param  Collection<int, Product>  $products
                 */
                function (Collection $products) use (&$indexed): void {
                    foreach ($products as $product) {
                        $this->indexProductAction->execute($product);
                        $indexed++;
                    }
                },
            );

        return $indexed;
    }
}
