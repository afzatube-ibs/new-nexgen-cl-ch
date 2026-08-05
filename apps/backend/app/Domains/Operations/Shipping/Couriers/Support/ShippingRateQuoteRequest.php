<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers\Support;

/**
 * Input to Contracts\ShippingProviderContract::quoteLiveRate() — the
 * minimal shape a courier's own live rate-quote API would need, if it
 * published one. See that method's docblock for why every courier shipped
 * with this module returns null rather than a real quote in Phase 1.
 */
final readonly class ShippingRateQuoteRequest
{
    public function __construct(
        public string $originCountryCode,
        public string $destinationCountryCode,
        public string $destinationRegion,
        public int $weightGrams,
    ) {}
}
