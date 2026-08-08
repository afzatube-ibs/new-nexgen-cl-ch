<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Actions;

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Engines\SearchEngineResolver;
use App\Domains\Commerce\Search\Engines\Support\SearchIndexEntry;

/**
 * This module's only write path into its own index (Engines\Contracts\
 * SearchEngineContract::index()'s only caller besides
 * Actions\RebuildSearchIndexAction) — denormalizes a Catalog Product's
 * own fields into the single `searchable_text` column
 * Engines\MySqlFullTextSearchEngine's FULLTEXT index actually searches,
 * per DATA:SEARCH_INDEXING.
 *
 * Every field folded into `searchable_text` here is read directly from
 * Catalog's own `Product` model (name, sku, barcode, description,
 * short_description, meta fields) or its directly-owned relations
 * (brand name, category names) — nothing from any other module, and
 * nothing this action couldn't reconstruct from scratch on a full
 * Actions\RebuildSearchIndexAction run, per that acceptance criterion.
 *
 * An archived (or soft-deleted) product is removed from the index rather
 * than indexed with `status=archived` — this module's index exists to
 * serve Actions\SearchProductsAction's search results, and nothing ever
 * needs to reach an archived product through Search (an operator browses
 * archived products through Catalog's own endpoints instead), so keeping
 * it here would only be index bloat with no reader.
 */
final readonly class IndexProductAction
{
    public function __construct(private SearchEngineResolver $searchEngineResolver) {}

    public function execute(Product $product): void
    {
        if ($product->status === Product::STATUS_ARCHIVED || $product->trashed()) {
            $this->searchEngineResolver->resolveDefault()->remove($product->id);

            return;
        }

        $product->loadMissing(['brand', 'categories']);

        $entry = new SearchIndexEntry(
            productId: $product->id,
            sku: $product->sku,
            name: $product->name,
            searchableText: $this->buildSearchableText($product),
            status: $product->status,
            visibility: $product->visibility,
            brandId: $product->brand_id,
            publishedAt: $product->published_at,
        );

        $this->searchEngineResolver->resolveDefault()->index($entry);
    }

    private function buildSearchableText(Product $product): string
    {
        $parts = [
            $product->name,
            $product->sku,
            $product->barcode,
            $product->short_description,
            $product->description,
            $product->meta_title,
            $product->meta_keywords,
            $product->brand?->name,
            ...$product->categories->pluck('name')->all(),
        ];

        return collect($parts)
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->implode(' ');
    }
}
