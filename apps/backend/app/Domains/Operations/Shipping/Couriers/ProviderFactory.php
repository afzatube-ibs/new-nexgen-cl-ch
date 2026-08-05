<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Exceptions\UnsupportedShippingProviderException;
use Illuminate\Http\Client\Factory as HttpFactory;

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
    public function __construct(private HttpFactory $http) {}

    /**
     * @param  array<string, mixed>  $config
     */
    public function make(string $code, array $config): ShippingProviderContract
    {
        return match ($code) {
            'manual' => new ManualProvider,
            'steadfast' => new SteadfastProvider($config, $this->http),
            'pathao' => new PathaoProvider($config, $this->http),
            'redx' => new RedxProvider($config, $this->http),
            'paperfly' => new PaperflyProvider($config, $this->http),
            'sundarban' => new SundarbanProvider,
            'ecourier' => new EcourierProvider($config, $this->http),
            default => throw new UnsupportedShippingProviderException($code),
        };
    }
}
