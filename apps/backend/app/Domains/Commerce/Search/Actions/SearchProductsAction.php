<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Actions;

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Engines\SearchEngineResolver;
use App\Domains\Commerce\Search\Engines\Support\SearchQuery;
use App\Domains\Commerce\Search\Engines\Support\SearchResult;

/**
 * This module's "Search query" Public Contract entry point — the only
 * way Http\Controllers\SearchController (or any future caller) reaches
 * a search result.
 *
 * `status`/`visibility` are hardcoded here to `active` and
 * `search`/`catalog_search` — never accepted as caller-supplied filters
 * — per the master plan's own Security Considerations line for this
 * module: "Search must not surface data a caller lacks permission to
 * see (e.g., unpublished products)." A draft or `not_visible`/
 * `catalog`-only product is present in the underlying index (Actions\
 * IndexProductAction indexes every non-archived product, per its own
 * docblock) but categorically unreachable through this Action — there is
 * no parameter combination that bypasses this, by construction, rather
 * than by a caller remembering to pass the "right" filter.
 */
final readonly class SearchProductsAction
{
    public function __construct(private SearchEngineResolver $searchEngineResolver) {}

    public function execute(
        ?string $term,
        ?string $brandId = null,
        string $sort = 'relevance',
        string $direction = 'desc',
        int $page = 1,
        int $perPage = 25,
    ): SearchResult {
        $query = new SearchQuery(
            term: $term,
            status: [Product::STATUS_ACTIVE],
            visibility: [Product::VISIBILITY_SEARCH, Product::VISIBILITY_CATALOG_SEARCH],
            brandId: $brandId,
            sort: $sort,
            direction: $direction,
            page: $page,
            perPage: $perPage,
        );

        return $this->searchEngineResolver->resolveDefault()->search($query);
    }
}
