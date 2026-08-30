<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways;

use App\Domains\Commerce\Payments\Exceptions\UnsupportedGatewayException;
use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;

/**
 * The lookup-with-validation half of "Gateway Registry / Gateway
 * Resolver" — every Action in this module that needs to talk to a
 * gateway goes through this class, never GatewayRegistry directly, so
 * "unregistered" and "registered but unavailable" are both refused in
 * exactly one place rather than re-checked ad hoc by every caller.
 */
final readonly class GatewayResolver
{
    public function __construct(private GatewayRegistry $registry) {}

    /**
     * @throws UnsupportedGatewayException when the gateway is unknown or
     *                                     currently unavailable (see
     *                                     PaymentGatewayContract::isAvailable()).
     */
    public function resolve(string $code): PaymentGatewayContract
    {
        $gateway = $this->registry->get($code);

        if ($gateway === null || ! $gateway->isAvailable()) {
            throw new UnsupportedGatewayException($code);
        }

        return $gateway;
    }

    /**
     * @return list<PaymentGatewayContract>
     */
    public function availableGateways(): array
    {
        return array_values(array_filter(
            $this->registry->all(),
            static fn (PaymentGatewayContract $gateway): bool => $gateway->isAvailable(),
        ));
    }

    /**
     * Every registered gateway, whether or not it is currently available —
     * mirrors Shipping's Couriers\ProviderResolver::allProviders() and
     * Notifications' Channels\ProviderResolver::allProviders() exactly, per
     * GatewayRegistry's own docblock ("for PaymentMethodController to
     * report as configured-but-incomplete"), realized here for Production
     * Completion Plan v2, Milestone 12 (Production Readiness Indicators).
     *
     * @return list<PaymentGatewayContract>
     */
    public function allGateways(): array
    {
        return array_values($this->registry->all());
    }
}
