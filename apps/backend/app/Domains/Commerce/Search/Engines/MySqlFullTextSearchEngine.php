<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Engines;

use App\Domains\Commerce\Search\Engines\Contracts\SearchEngineContract;
use App\Domains\Commerce\Search\Engines\Support\SearchIndexEntry;
use App\Domains\Commerce\Search\Engines\Support\SearchQuery;
use App\Domains\Commerce\Search\Engines\Support\SearchResult;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Database\Eloquent\Builder;

/**
 * The one real, functional Engines\Contracts\SearchEngineContract
 * implementation this delivery ships — MySQL/MariaDB's native FULLTEXT
 * index (InnoDB, supported since MariaDB 10.0.5) against
 * `product_search_index`'s own `search_fulltext_index (name,
 * searchable_text)`, per ADR-0003's "deployable without specialized
 * database administration expertise" requirement: no separate search
 * engine to install, operate, or keep in sync beyond this table itself.
 *
 * `search()`'s relevance ranking is MySQL's own built-in FULLTEXT
 * relevance score (`MATCH ... AGAINST`, natural language mode) — "Phase 1
 * basic," per the master plan's own framing, deliberately not a custom
 * scoring/weighting scheme. A future engine swap (Elasticsearch,
 * Meilisearch) is the documented path for anything more sophisticated,
 * per this class's own Contracts\SearchEngineContract docblock.
 */
final class MySqlFullTextSearchEngine implements SearchEngineContract
{
    public function code(): string
    {
        return 'mysql_fulltext';
    }

    public function label(): string
    {
        return 'MySQL/MariaDB Full-Text Search';
    }

    public function isAvailable(): bool
    {
        // Always available: this engine only depends on the primary
        // datastore every module already requires (ADR-0003), never on
        // an external service or optional credentials — unlike
        // Notifications' provider adapters, there is no configuration
        // gap that could make this engine unusable.
        return true;
    }

    public function index(SearchIndexEntry $entry): void
    {
        ProductSearchIndex::query()->updateOrCreate(
            ['product_id' => $entry->productId],
            [
                'sku' => $entry->sku,
                'name' => $entry->name,
                'searchable_text' => $entry->searchableText,
                'status' => $entry->status,
                'visibility' => $entry->visibility,
                'brand_id' => $entry->brandId,
                'published_at' => $entry->publishedAt,
            ],
        );
    }

    public function remove(string $productId): void
    {
        ProductSearchIndex::query()->where('product_id', $productId)->delete();
    }

    public function search(SearchQuery $query): SearchResult
    {
        $builder = ProductSearchIndex::query();

        $this->applyFilters($builder, $query);

        $term = $query->term !== null ? trim($query->term) : null;
        $hasTerm = $term !== null && $term !== '';
        $hasMatchScore = false;

        if ($hasTerm) {
            // Boolean mode with a trailing wildcard on every term, rather
            // than natural language mode, so a partial/in-progress word
            // (the "search-as-you-type" half of this module's Enterprise
            // SaaS UX requirement — see Http\Controllers\
            // SearchController's own docblock) still matches — natural
            // language mode only ever matches whole indexed words.
            $booleanQuery = $this->toBooleanPrefixQuery($term);

            if ($booleanQuery === '') {
                // Every word was shorter than InnoDB's default
                // ft_min_word_len (4 chars) and got stripped entirely —
                // FULLTEXT cannot index or match it at all, so fall back
                // to a plain LIKE scan rather than silently returning zero
                // results for a legitimate short query (e.g. a SKU
                // fragment or a 2-3 letter brand name).
                $builder->where(function (Builder $q) use ($term): void {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('sku', 'like', "%{$term}%")
                        ->orWhere('searchable_text', 'like', "%{$term}%");
                });
            } else {
                $builder
                    ->selectRaw('*, MATCH(name, searchable_text) AGAINST(? IN BOOLEAN MODE) AS relevance_score', [$booleanQuery])
                    ->whereRaw('MATCH(name, searchable_text) AGAINST(? IN BOOLEAN MODE)', [$booleanQuery]);
                $hasMatchScore = true;
            }
        }

        $total = (clone $builder)->toBase()->getCountForPagination();

        $this->applySort($builder, $query, $hasMatchScore);

        $perPage = max(1, $query->perPage);
        $page = max(1, $query->page);

        $items = $builder
            ->forPage($page, $perPage)
            ->get();

        return new SearchResult(
            items: $items,
            total: $total,
            page: $page,
            perPage: $perPage,
        );
    }

    /**
     * @param  Builder<ProductSearchIndex>  $builder
     */
    private function applyFilters(Builder $builder, SearchQuery $query): void
    {
        if ($query->status !== []) {
            $builder->whereIn('status', $query->status);
        }

        if ($query->visibility !== []) {
            $builder->whereIn('visibility', $query->visibility);
        }

        if ($query->brandId !== null) {
            $builder->where('brand_id', $query->brandId);
        }
    }

    /**
     * @param  Builder<ProductSearchIndex>  $builder
     */
    private function applySort(Builder $builder, SearchQuery $query, bool $hasMatchScore): void
    {
        $direction = $query->direction === 'asc' ? 'asc' : 'desc';

        if ($query->sort === 'relevance' && $hasMatchScore) {
            $builder->orderByDesc('relevance_score');

            return;
        }

        $sortable = ['name', 'published_at', 'created_at'];
        $sort = in_array($query->sort, $sortable, true) ? $query->sort : 'name';

        $builder->orderBy($sort, $direction);
    }

    /**
     * Turns a raw user query into a MySQL BOOLEAN MODE query string: each
     * word shorter than InnoDB's default `ft_min_word_len` (4 characters)
     * is dropped (FULLTEXT cannot index it, so leaving it in would only
     * risk a boolean-mode syntax error from a lone `+`/`*` operator with
     * nothing attached), FULLTEXT's own boolean operator characters
     * (`+-><()~*"@`) are stripped from user input so a query can never be
     * (mis)interpreted as an operator sequence, and every remaining word
     * gets a trailing `*` for prefix matching.
     */
    private function toBooleanPrefixQuery(string $term): string
    {
        $words = preg_split('/\s+/', $term, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $clauses = [];

        foreach ($words as $word) {
            $sanitized = preg_replace('/[+\-><()~*"@]/', '', $word) ?? '';

            if (mb_strlen($sanitized) < 4) {
                continue;
            }

            $clauses[] = '+'.$sanitized.'*';
        }

        return implode(' ', $clauses);
    }
}
