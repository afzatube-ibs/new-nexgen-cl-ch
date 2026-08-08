<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Engines;

use App\Domains\Commerce\Search\Engines\Contracts\SearchEngineContract;

/**
 * The storage half of "Engine Registry / Engine Resolver" — holds every
 * search engine Providers\SearchServiceProvider constructed via Engines\
 * SearchEngineFactory from config/search.php, keyed by each engine's own
 * SearchEngineContract::code(). Mirrors Notifications' Channels\
 * ProviderRegistry, Payments' Gateways\GatewayRegistry, and Shipping's
 * Couriers\ProviderRegistry exactly, including registering regardless of
 * isAvailable().
 */
final class SearchEngineRegistry
{
    /**
     * @var array<string, SearchEngineContract>
     */
    private array $engines = [];

    public function register(SearchEngineContract $engine): void
    {
        $this->engines[$engine->code()] = $engine;
    }

    public function has(string $code): bool
    {
        return array_key_exists($code, $this->engines);
    }

    public function get(string $code): ?SearchEngineContract
    {
        return $this->engines[$code] ?? null;
    }

    /**
     * @return array<string, SearchEngineContract>
     */
    public function all(): array
    {
        return $this->engines;
    }
}
