<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;

/**
 * RedX — a Bangladesh-first nationwide courier. Production-ready
 * architecture against its real, documented OpenAPI parcel platform
 * (Bearer `API-ACCESS-TOKEN` authentication), gated by isAvailable() on
 * this installation's configured credentials. RedX's OpenAPI publishes
 * parcel creation/tracking endpoints but no live, per-shipment rate-quote
 * endpoint (confirmed against its own developer API documentation);
 * quoteLiveRate() honestly reflects that per Contracts\
 * ShippingProviderContract::quoteLiveRate()'s docblock.
 */
final readonly class RedxProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config) {}

    public function code(): string
    {
        return 'redx';
    }

    public function label(): string
    {
        return 'RedX';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['api_token'] ?? null);
    }

    public function supportsLiveRateQuote(): bool
    {
        return false;
    }

    public function quoteLiveRate(ShippingRateQuoteRequest $request): ?ShippingRateQuoteResult
    {
        return null;
    }
}
