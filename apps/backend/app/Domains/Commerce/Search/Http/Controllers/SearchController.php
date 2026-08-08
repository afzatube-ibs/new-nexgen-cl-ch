<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Http\Controllers;

use App\Domains\Commerce\Search\Actions\RebuildSearchIndexAction;
use App\Domains\Commerce\Search\Actions\SearchProductsAction;
use App\Domains\Commerce\Search\Audit\AuditLogger;
use App\Domains\Commerce\Search\Http\Requests\SearchProductsRequest;
use App\Domains\Commerce\Search\Http\Resources\ProductSearchResultResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * MODULE:SEARCH's public HTTP contract — per the accepted scope decision
 * (docs/04_MODULE_ARCHITECTURE.md v1.5): full-text, relevance-ranked,
 * indexed Product search. "Global Search" and "Product Search" from the
 * original implementation instruction are the same endpoint here,
 * documented deliberately — this module's accepted boundary is a Catalog
 * product index only (Customer/Order/Store/Template/Audit search are
 * each satisfied by their own owning module's list endpoint instead, per
 * the Product Owner's own scope ruling).
 *
 * "Keyboard navigation" and "Enterprise SaaS UX" — this module's own
 * scope requirements — are satisfied at the API-contract level, matching
 * every other Phase 1 module's backend-only delivery (no frontend
 * package exists in this repository yet): relevance-ranked results
 * suited to an instant-search/command-palette client (fast prefix
 * matching via Engines\MySqlFullTextSearchEngine's own BOOLEAN MODE
 * query, a small default page size, and a stable, ordinal `data[]` array
 * a keyboard-driven client can index directly for arrow-key selection)
 * rather than any server-rendered UI.
 *
 * Every action here is behind `permission:search.*` middleware (see
 * routes.php) — this controller trusts that enforcement happened
 * already, per SECURITY:DEFENSE_IN_DEPTH.
 */
final class SearchController
{
    public function __construct(
        private readonly SearchProductsAction $searchProductsAction,
        private readonly RebuildSearchIndexAction $rebuildSearchIndexAction,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function products(SearchProductsRequest $request): AnonymousResourceCollection
    {
        $result = $this->searchProductsAction->execute(
            term: $request->string('q')->toString() ?: null,
            brandId: $request->filled('brand_id') ? $request->string('brand_id')->toString() : null,
            sort: $request->string('sort', 'relevance')->toString(),
            direction: $request->string('direction', 'desc')->toString(),
            page: (int) $request->integer('page', 1),
            perPage: (int) $request->integer('per_page', 25),
        );

        $paginator = new LengthAwarePaginator(
            items: $result->items,
            total: $result->total,
            perPage: $result->perPage,
            currentPage: $result->page,
            options: ['path' => $request->url(), 'query' => $request->query()],
        );

        return ProductSearchResultResource::collection($paginator);
    }

    public function reindex(Request $request): JsonResponse
    {
        $indexed = $this->rebuildSearchIndexAction->execute();

        $this->auditLogger->log(
            action: 'search.index.rebuilt',
            actorId: $request->user()?->id,
            after: ['indexed_count' => $indexed],
        );

        return response()->json(['indexedCount' => $indexed]);
    }
}
