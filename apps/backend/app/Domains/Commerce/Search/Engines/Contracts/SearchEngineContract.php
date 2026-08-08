<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Engines\Contracts;

use App\Domains\Commerce\Search\Engines\Support\SearchIndexEntry;
use App\Domains\Commerce\Search\Engines\Support\SearchQuery;
use App\Domains\Commerce\Search\Engines\Support\SearchResult;

/**
 * The one seam this module's full-text search abstraction integrates
 * through — "Full-text search abstraction" from the master plan's own
 * Search entry, mirroring Payments' Gateways\Contracts\
 * PaymentGatewayContract and Notifications' Channels\Contracts\
 * NotificationProviderContract exactly. A future engine (Elasticsearch,
 * Meilisearch, or any other specialized search service, should
 * multi-tenant SaaS scale ever require moving off MySQL FULLTEXT) becomes
 * a new class implementing this interface plus an Engines\
 * SearchEngineFactory case and a config/search.php entry — never a
 * change to Models\ProductSearchIndex, any Actions\* class, or any
 * controller.
 *
 * Only `mysql_fulltext` (Engines\MySqlFullTextSearchEngine) has a real,
 * functional implementation in this delivery, per ADR-0003's operational-
 * simplicity requirement — this interface itself is engine-agnostic by
 * design specifically so a future engine plugs into the identical
 * `search()`/`index()`/`remove()` shape without this interface, or any
 * of this module's own Actions, needing to change at all.
 */
interface SearchEngineContract
{
    /**
     * The stable identifier this engine is registered and resolved
     * under — must match its config/search.php key.
     */
    public function code(): string;

    public function label(): string;

    /**
     * Whether this engine is currently usable — false when required
     * configuration is absent or a required extension/service is
     * unreachable. Engines\SearchEngineResolver refuses to resolve an
     * unavailable engine rather than letting a caller discover the gap
     * mid-search.
     */
    public function isAvailable(): bool;

    /**
     * Upserts a single entry — Actions\IndexProductAction's only way to
     * write to the index, per DATA:SEARCH_INDEXING. Never partial: a full
     * replace of everything this engine knows about the given product.
     */
    public function index(SearchIndexEntry $entry): void;

    /**
     * Removes a single entry by its owning product's identity — used on
     * both explicit archival (Listeners\
     * RemoveProductFromIndexOnProductArchived) and whenever
     * Actions\IndexProductAction determines a product no longer belongs
     * in the index at all.
     */
    public function remove(string $productId): void;

    public function search(SearchQuery $query): SearchResult;
}
