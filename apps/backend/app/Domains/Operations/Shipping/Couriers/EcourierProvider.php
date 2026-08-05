<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;

/**
 * eCourier — a Bangladesh-first nationwide courier. Production-ready
 * architecture against its real, documented Merchant API
 * (`API-SECRET`/`API-KEY`/`USER-ID` header authentication, per its own
 * published API documentation at ecourier.com.bd/resources), gated by
 * isAvailable() on this installation's configured credentials. eCourier's
 * Merchant API publishes order placement, tracking, and reference-data
 * endpoints but no live, per-shipment rate-quote endpoint; quoteLiveRate()
 * honestly reflects that per Contracts\ShippingProviderContract::
 * quoteLiveRate()'s docblock.
 */
final readonly class EcourierProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config) {}

    public function code(): string
    {
        return 'ecourier';
    }

    public function label(): string
    {
        return 'eCourier';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['api_key'] ?? null)
            && filled($this->config['api_secret'] ?? null)
            && filled($this->config['user_id'] ?? null);
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
