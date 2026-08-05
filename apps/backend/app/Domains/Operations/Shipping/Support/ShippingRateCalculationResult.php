<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Support;

/**
 * Actions\CalculateShippingRateAction's return shape — this module's
 * "Rate query" Public Contract, per planning/IMPLEMENTATION_MASTER_PLAN.md's
 * Shipping & Logistics entry.
 */
final readonly class ShippingRateCalculationResult
{
    public function __construct(
        public string $shippingMethodId,
        public ?string $shippingZoneId,
        public ?string $shippingRateId,
        public int $weightGrams,
        public string $amount,
        public string $currencyCode,
    ) {}
}
