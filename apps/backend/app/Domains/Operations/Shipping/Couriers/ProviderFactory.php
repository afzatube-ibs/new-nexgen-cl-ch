<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Exceptions\UnsupportedShippingProviderException;

/**
 * The construction half of this module's courier architecture — turns a
 * provider code plus its config/shipping.php configuration array into a
 * concrete Couriers\Contracts\ShippingProviderContract instance. Mirrors
 * Payments' Gateways\GatewayFactory exactly: Providers\
 * ShippingServiceProvider is this class's only caller, iterating
 * config/shipping.php's `providers` list.
 *
 * "Future couriers must only implement the ShippingProvider contract" —
 * this `match` arm plus one new config block is the entire registration
 * step for a new courier; nothing else in this module changes.
 */
final readonly class ProviderFactory
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function make(string $code, array $config): ShippingProviderContract
    {
        return match ($code) {
            'manual' => new ManualProvider,
            'steadfast' => new SteadfastProvider($config),
            'pathao' => new PathaoProvider($config),
            'redx' => new RedxProvider($config),
            'paperfly' => new PaperflyProvider($config),
            'sundarban' => new SundarbanProvider,
            'ecourier' => new EcourierProvider($config),
            default => throw new UnsupportedShippingProviderException($code),
        };
    }
}
