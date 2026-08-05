<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers\Support;

/**
 * Output of Contracts\ShippingProviderContract::quoteLiveRate() for a
 * courier that genuinely publishes a live rate-quote API.
 */
final readonly class ShippingRateQuoteResult
{
    public function __construct(
        public string $amount,
        public string $currencyCode,
        public string $providerCode,
        /** @var array<string, mixed> */
        public array $raw = [],
    ) {}
}
