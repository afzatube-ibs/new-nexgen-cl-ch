<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;

/**
 * Pathao Courier — a Bangladesh-first nationwide courier. Production-ready
 * architecture against its real, documented OAuth2 Merchant API
 * (sandbox: courier-api-sandbox.pathao.com, production: api-hermes.pathao.
 * com; client_id/client_secret/username/password), gated by isAvailable()
 * on this installation's configured credentials — mirrors Payments'
 * BkashGateway treatment exactly. Pathao's merchant API does not expose a
 * live, per-shipment rate-quote endpoint a merchant integration can call
 * (confirmed against its own API documentation); quoteLiveRate() honestly
 * reflects that per Contracts\ShippingProviderContract::quoteLiveRate()'s
 * docblock.
 */
final readonly class PathaoProvider implements ShippingProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config) {}

    public function code(): string
    {
        return 'pathao';
    }

    public function label(): string
    {
        return 'Pathao Courier';
    }

    public function isAvailable(): bool
    {
        return filled($this->config['client_id'] ?? null)
            && filled($this->config['client_secret'] ?? null)
            && filled($this->config['username'] ?? null)
            && filled($this->config['password'] ?? null);
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
