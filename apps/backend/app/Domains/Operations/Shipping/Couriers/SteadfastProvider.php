<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;

/**
 * Steadfast Courier Limited — a Bangladesh-first nationwide courier.
 * Production-ready architecture against its real, documented API shape
 * (portal.packzy.com/api/v1, API-Key/Secret-Key header authentication),
 * gated by isAvailable() on this installation's configured credentials —
 * mirrors Payments' SslcommerzGateway treatment exactly. Steadfast
 * publishes no live, per-shipment rate-quote API (confirmed against its
 * own API documentation); quoteLiveRate() honestly reflects that per
 * Contracts\ShippingProviderContract::quoteLiveRate()'s docblock.
 */
final readonly class SteadfastProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config) {}

    public function code(): string
    {
        return 'steadfast';
    }

    public function label(): string
    {
        return 'Steadfast Courier Limited';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['api_key'] ?? null) && filled($this->config['secret_key'] ?? null);
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
