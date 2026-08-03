<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Support;

/**
 * The result of Actions\CalculateTaxAction — a plain value, not an
 * Eloquent model, since tax calculation is a stateless computation, per
 * planning/IMPLEMENTATION_MASTER_PLAN.md's "tax calculation service"
 * Public Contract, not a persisted aggregate.
 */
final readonly class TaxCalculationResult
{
    public function __construct(
        public string $amount,
        public string $rate,
        public string $taxAmount,
        public string $totalAmount,
        public ?string $taxZoneId,
    ) {}
}
