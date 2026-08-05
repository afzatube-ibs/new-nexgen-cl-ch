<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;

/**
 * The storage half of "Provider Registry / Provider Resolver" — holds
 * every courier Providers\ShippingServiceProvider constructed via
 * Couriers\ProviderFactory from config/shipping.php's `providers` list,
 * keyed by each provider's own ShippingProviderContract::code(). Mirrors
 * Payments' Gateways\GatewayRegistry exactly (see that class's docblock
 * for the identical rationale, including why this is registered
 * regardless of isAvailable()).
 */
final class ProviderRegistry
{
    /**
     * @var array<string, ShippingProviderContract>
     */
    private array $providers = [];

    public function register(ShippingProviderContract $provider): void
    {
        $this->providers[$provider->code()] = $provider;
    }

    public function has(string $code): bool
    {
        return array_key_exists($code, $this->providers);
    }

    public function get(string $code): ?ShippingProviderContract
    {
        return $this->providers[$code] ?? null;
    }

    /**
     * @return array<string, ShippingProviderContract>
     */
    public function all(): array
    {
        return $this->providers;
    }
}
