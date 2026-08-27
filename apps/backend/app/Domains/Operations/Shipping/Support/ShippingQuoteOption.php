<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Support;

/**
 * One real, quotable Support\ShippingRateCalculationResult paired with its
 * owning ShippingMethod's own `name`, for a caller (a storefront checkout)
 * that needs to present a shopper a real, human-readable choice — a bare
 * ShippingRateCalculationResult on its own has no label, only ids.
 */
final readonly class ShippingQuoteOption
{
    public function __construct(
        public string $shippingMethodId,
        public string $label,
        public ?string $shippingZoneId,
        public ?string $shippingRateId,
        public int $weightGrams,
        public string $amount,
        public string $currencyCode,
    ) {}
}
