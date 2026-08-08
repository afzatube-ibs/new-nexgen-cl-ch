<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Engines;

use App\Domains\Commerce\Search\Engines\Contracts\SearchEngineContract;
use App\Domains\Commerce\Search\Exceptions\UnsupportedSearchEngineException;

/**
 * The lookup-with-validation half of "Engine Registry / Engine
 * Resolver" — mirrors Notifications' Channels\ProviderResolver,
 * Payments' Gateways\GatewayResolver, and Shipping's Couriers\
 * ProviderResolver exactly: every Action that needs to index or search
 * goes through this class, never SearchEngineRegistry directly, so
 * "unregistered" and "registered but unavailable" are both refused in
 * exactly one place.
 */
final readonly class SearchEngineResolver
{
    public function __construct(private SearchEngineRegistry $registry) {}

    /**
     * The single configured default engine (config('search.default_engine'))
     * — unlike Notifications' multi-provider-per-channel resolution, this
     * module has exactly one active engine at a time, per ADR-0003's
     * operational-simplicity requirement, so there is no per-request
     * engine selection to make.
     *
     * @throws UnsupportedSearchEngineException when the configured engine
     *                                          is unknown or currently
     *                                          unavailable (see
     *                                          SearchEngineContract::isAvailable()).
     */
    public function resolveDefault(): SearchEngineContract
    {
        $code = (string) config('search.default_engine');

        $engine = $this->registry->get($code);

        if ($engine === null || ! $engine->isAvailable()) {
            throw new UnsupportedSearchEngineException($code);
        }

        return $engine;
    }
}
