<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Exceptions\UnsupportedShippingProviderException;

/**
 * The lookup-with-validation half of "Provider Registry / Provider
 * Resolver" — mirrors Payments' Gateways\GatewayResolver exactly: every
 * caller that needs to talk to a courier goes through this class, never
 * ProviderRegistry directly, so "unregistered" and "registered but
 * unavailable" are both refused in exactly one place.
 */
final readonly class ProviderResolver
{
    public function __construct(private ProviderRegistry $registry) {}

    /**
     * @throws UnsupportedShippingProviderException when the provider is
     *                                              unknown or currently
     *                                              unavailable (see
     *                                              ShippingProviderContract::isAvailable()).
     */
    public function resolve(string $code): ShippingProviderContract
    {
        $provider = $this->registry->get($code);

        if ($provider === null || ! $provider->isAvailable()) {
            throw new UnsupportedShippingProviderException($code);
        }

        return $provider;
    }

    /**
     * @return list<ShippingProviderContract>
     */
    public function availableProviders(): array
    {
        return array_values(array_filter(
            $this->registry->all(),
            static fn (ShippingProviderContract $provider): bool => $provider->isAvailable(),
        ));
    }

    /**
     * @return list<ShippingProviderContract>
     */
    public function allProviders(): array
    {
        return array_values($this->registry->all());
    }
}
