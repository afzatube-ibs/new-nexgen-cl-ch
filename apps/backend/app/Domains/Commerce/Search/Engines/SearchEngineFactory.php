<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Engines;

use App\Domains\Commerce\Search\Engines\Contracts\SearchEngineContract;
use App\Domains\Commerce\Search\Exceptions\UnsupportedSearchEngineException;

/**
 * The construction half of this module's search-engine architecture —
 * turns an engine code plus its config/search.php configuration array
 * into a concrete Engines\Contracts\SearchEngineContract instance.
 * Mirrors Notifications' Channels\ProviderFactory, Payments' Gateways\
 * GatewayFactory, and Shipping's Couriers\ProviderFactory exactly:
 * Providers\SearchServiceProvider is this class's only caller.
 *
 * Only `mysql_fulltext` is registered here in this delivery — a future
 * engine adds one new `match` arm plus a config block; nothing else in
 * this module changes, exactly as this factory's own sibling modules
 * already demonstrate for their own extension points.
 */
final readonly class SearchEngineFactory
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function make(string $code, array $config): SearchEngineContract
    {
        return match ($code) {
            'mysql_fulltext' => new MySqlFullTextSearchEngine,
            default => throw new UnsupportedSearchEngineException($code),
        };
    }
}
