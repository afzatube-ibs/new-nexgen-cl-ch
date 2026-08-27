<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Support\ShippingQuoteOption;

/**
 * MODULE:SHIPPING's real "which of my methods can actually ship this
 * parcel, and for how much" Public Contract — the multi-method companion
 * to Actions\CalculateShippingRateAction's own single-method quote. Built
 * for a real storefront checkout that needs to present a shopper a real
 * comparison (Standard vs. Express, etc.), not just confirm one already-
 * chosen method — the exact "delivery estimation" capability docs/
 * 04_MODULE_ARCHITECTURE.md's `MODULE:SHIPPING` entry names.
 *
 * Duplicates none of CalculateShippingRateAction's own rate-resolution
 * logic (zone matching, weight brackets, live-courier-quote preference):
 * this action only enumerates this tenant's real active ShippingMethods
 * and delegates the actual quote for each to that action unchanged, per
 * this platform's own "no duplicate shipping logic" rule. A method with no
 * configured rate for the given destination/weight is silently omitted —
 * never a fabricated $0 entry — exactly mirroring that action's own
 * honest-null philosophy.
 */
final readonly class QuoteShippingOptionsAction
{
    public function __construct(private CalculateShippingRateAction $calculateShippingRateAction) {}

    /**
     * @return list<ShippingQuoteOption>
     */
    public function execute(string $countryCode, string $region, int $weightGrams): array
    {
        $methods = ShippingMethod::query()
            ->where('status', ShippingMethod::STATUS_ACTIVE)
            ->orderBy('name')
            ->get();

        $options = [];

        foreach ($methods as $method) {
            $result = $this->calculateShippingRateAction->execute(
                shippingMethodId: $method->id,
                countryCode: $countryCode,
                region: $region,
                weightGrams: $weightGrams,
            );

            if ($result === null) {
                continue;
            }

            $options[] = new ShippingQuoteOption(
                shippingMethodId: $result->shippingMethodId,
                label: $method->name,
                shippingZoneId: $result->shippingZoneId,
                shippingRateId: $result->shippingRateId,
                weightGrams: $result->weightGrams,
                amount: $result->amount,
                currencyCode: $result->currencyCode,
            );
        }

        return $options;
    }
}
