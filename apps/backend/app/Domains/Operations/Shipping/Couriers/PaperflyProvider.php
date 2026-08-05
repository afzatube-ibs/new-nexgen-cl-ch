<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;

/**
 * Paperfly — a Bangladesh-first nationwide courier. Unlike Steadfast,
 * Pathao, and RedX, Paperfly issues per-seller API credentials and a
 * per-seller base URL directly through its account team rather than
 * publishing one shared public base URL (confirmed against its own
 * merchant onboarding process) — this provider is therefore available only
 * once an operator has supplied both `merchant_id`/`api_key` AND the
 * seller-specific `base_url` Paperfly issued them. Paperfly publishes no
 * live, per-shipment rate-quote endpoint; quoteLiveRate() honestly
 * reflects that per Contracts\ShippingProviderContract::quoteLiveRate()'s
 * docblock.
 */
final readonly class PaperflyProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config) {}

    public function code(): string
    {
        return 'paperfly';
    }

    public function label(): string
    {
        return 'Paperfly';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['merchant_id'] ?? null)
            && filled($this->config['api_key'] ?? null)
            && filled($this->config['base_url'] ?? null);
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
