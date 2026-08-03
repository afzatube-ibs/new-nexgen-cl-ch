<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Models\TaxRate;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use App\Domains\Commerce\Pricing\Support\TaxCalculationResult;
use InvalidArgumentException;

/**
 * MODULE:PRICING's "tax calculation service" Public Contract, per
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Pricing & Tax entry. Stateless:
 * reads TaxZone/TaxRate, writes nothing, publishes nothing — the future
 * Checkout and Orders modules are this action's anticipated callers, per
 * that same entry's "Responsibilities: tax rule application by
 * jurisdiction."
 *
 * Zone matching prefers the more specific zone: an exact
 * (country_code, region) match is tried first, falling back to the
 * country-wide zone (region = ''). No matching active rate is a valid,
 * common outcome — not every jurisdiction has configured tax nexus — and
 * resolves to zero tax rather than an error, per the distinction
 * PRINCIPLES:EXPLICIT_FAILURE draws between a genuine failure and a
 * legitimate zero-value result.
 *
 * Uses bcmath for the multiplication rather than native float arithmetic:
 * this is the platform's first real monetary calculation, and floating-
 * point rounding error is not an acceptable source of imprecision for
 * tax amounts.
 */
final readonly class CalculateTaxAction
{
    private const int SCALE = 4;

    public function execute(string $taxClassId, string $countryCode, string $region, string $amount): TaxCalculationResult
    {
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException('Amount must be a numeric string.');
        }

        $countryCode = strtoupper($countryCode);
        $region = strtoupper($region);

        $rate = $this->resolveRate($taxClassId, $countryCode, $region);

        if ($rate === null) {
            return new TaxCalculationResult(
                amount: $amount,
                rate: '0.0000',
                taxAmount: '0.0000',
                totalAmount: bcadd($amount, '0', self::SCALE),
                taxZoneId: null,
            );
        }

        $rateValue = $rate->rate;

        if (! is_numeric($rateValue)) {
            throw new InvalidArgumentException('Tax rate must be a numeric string.');
        }

        $taxAmount = bcdiv(bcmul($amount, $rateValue, self::SCALE + 2), '100', self::SCALE);
        $totalAmount = bcadd($amount, $taxAmount, self::SCALE);

        return new TaxCalculationResult(
            amount: $amount,
            rate: $rate->rate,
            taxAmount: $taxAmount,
            totalAmount: $totalAmount,
            taxZoneId: $rate->tax_zone_id,
        );
    }

    private function resolveRate(string $taxClassId, string $countryCode, string $region): ?TaxRate
    {
        if ($region !== '') {
            $specific = $this->findRate($taxClassId, $countryCode, $region);

            if ($specific !== null) {
                return $specific;
            }
        }

        return $this->findRate($taxClassId, $countryCode, '');
    }

    private function findRate(string $taxClassId, string $countryCode, string $region): ?TaxRate
    {
        return TaxRate::query()
            ->where('tax_class_id', $taxClassId)
            ->where('status', TaxRate::STATUS_ACTIVE)
            ->whereHas('taxZone', function ($query) use ($countryCode, $region): void {
                $query->where('country_code', $countryCode)
                    ->where('region', $region)
                    ->where('status', TaxZone::STATUS_ACTIVE);
            })
            ->first();
    }
}
