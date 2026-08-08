<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Engines\Support;

use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Support\Collection;

/**
 * The engine-agnostic outcome every Engines\Contracts\SearchEngineContract::
 * search() call returns — a plain page of Models\ProductSearchIndex rows
 * plus enough pagination metadata for Http\Resources\
 * ProductSearchResultResource to build a standard paginated response
 * without the engine itself depending on Laravel's
 * LengthAwarePaginator (a future non-MySQL engine — Elasticsearch,
 * Meilisearch — returns hits from its own client library, not an
 * Eloquent builder, so this DTO is the seam that keeps
 * Actions\SearchProductsAction and the Http layer engine-agnostic).
 */
final readonly class SearchResult
{
    /**
     * @param  Collection<int, ProductSearchIndex>  $items
     */
    public function __construct(
        public Collection $items,
        public int $total,
        public int $page,
        public int $perPage,
    ) {}

    public function lastPage(): int
    {
        if ($this->perPage <= 0) {
            return 1;
        }

        return max(1, (int) ceil($this->total / $this->perPage));
    }
}
