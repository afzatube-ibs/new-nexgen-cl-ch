<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Engines\Support;

/**
 * The engine-agnostic shape every Engines\Contracts\SearchEngineContract::
 * search() call receives, built by Actions\SearchProductsAction from a
 * validated Http\Requests\SearchProductsRequest. `term` is optional — an
 * empty term is a valid, common request ("browse everything matching
 * these filters, sorted this way") that Engines\
 * MySqlFullTextSearchEngine falls back to a plain filtered/sorted list
 * for, per the master plan's own "Phase 1 basic" full-text scope: MySQL
 * FULLTEXT's `MATCH ... AGAINST` has no defined behavior for an empty
 * search string.
 *
 * `status`/`visibility` are always populated by
 * Actions\SearchProductsAction itself, never left to the caller — see
 * that Action's own docblock for why permission-aware filtering must not
 * be an optional, caller-supplied filter.
 */
final readonly class SearchQuery
{
    /**
     * @param  list<string>  $status
     * @param  list<string>  $visibility
     */
    public function __construct(
        public ?string $term,
        public array $status,
        public array $visibility,
        public ?string $brandId,
        public string $sort = 'relevance',
        public string $direction = 'desc',
        public int $page = 1,
        public int $perPage = 25,
    ) {}
}
