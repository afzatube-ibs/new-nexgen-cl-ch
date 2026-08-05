<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Actions;

use App\Domains\Operations\Shipping\Couriers\ProviderRegistry;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;
use App\Domains\Operations\Shipping\Events\ShippingRateCalculated;
use App\Domains\Operations\Shipping\Models\ShippingMethod;
use App\Domains\Operations\Shipping\Models\ShippingRate;
use App\Domains\Operations\Shipping\Models\ShippingZone;
use App\Domains\Operations\Shipping\Support\ShippingRateCalculationResult;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;

/**
 * MODULE:SHIPPING's "Rate query" Public Contract, per planning/
 * IMPLEMENTATION_MASTER_PLAN.md's Shipping & Logistics entry. Stateless
 * with respect to its own aggregates: reads ShippingMethod/ShippingZone/
 * ShippingRate, writes nothing to them — mirrors Pricing's
 * CalculateTaxAction exactly, including the same zone-matching precedence
 * (an exact country_code+region match is tried first, falling back to the
 * country-wide zone).
 *
 * Unlike CalculateTaxAction, a shipping rate with no matching configured
 * ShippingRate is NOT resolved to zero — a merchant charging BDT 0.00 to
 * ship a real parcel is a financial defect, not a legitimate "nothing
 * owed" outcome the way zero tax is. This action returns null in that
 * case, per PRINCIPLES:EXPLICIT_FAILURE's distinction between a genuine
 * zero-value result and "this cannot currently be answered" — the caller
 * (Http\Controllers\ShippingRateQuoteController) surfaces that plainly
 * rather than fabricating a figure. This is also this module's concrete
 * satisfaction of the master plan's acceptance criterion that "a carrier
 * integration failure degrades gracefully ... never blocking checkout
 * entirely if an alternative shipping method exists": a null result for
 * one method is exactly the signal a caller needs to try another
 * configured method instead of treating the whole quote operation as
 * fatal.
 *
 * If the resolved ShippingMethod names a courier provider that publishes a
 * genuine live rate-quote API (Couriers\Contracts\ShippingProviderContract
 * ::supportsLiveRateQuote()), that live quote is preferred over the
 * configured ShippingRate card; every Bangladesh-first courier shipped
 * with this module reports false for that capability today (see
 * config/shipping.php's docblock), so this platform's own configured rate
 * card is the effective source of truth in Phase 1 — the branch exists so
 * a future courier that does publish one is used automatically, with no
 * change to this action.
 */
final readonly class CalculateShippingRateAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private ProviderRegistry $providerRegistry,
    ) {}

    public function execute(
        string $shippingMethodId,
        string $countryCode,
        string $region,
        int $weightGrams,
    ): ?ShippingRateCalculationResult {
        $method = ShippingMethod::query()->find($shippingMethodId);

        if ($method === null || ! $method->isActive()) {
            return null;
        }

        $countryCode = strtoupper($countryCode);
        $region = strtoupper($region);

        $liveQuote = $this->tryLiveQuote($method, $countryCode, $region, $weightGrams);

        if ($liveQuote !== null) {
            $result = new ShippingRateCalculationResult(
                shippingMethodId: $method->id,
                shippingZoneId: null,
                shippingRateId: null,
                weightGrams: $weightGrams,
                amount: $liveQuote->amount,
                currencyCode: $liveQuote->currencyCode,
            );

            $this->publish($result);

            return $result;
        }

        $rate = $this->resolveConfiguredRate($method, $countryCode, $region, $weightGrams);

        if ($rate === null) {
            return null;
        }

        $result = new ShippingRateCalculationResult(
            shippingMethodId: $method->id,
            shippingZoneId: $rate->shipping_zone_id,
            shippingRateId: $rate->id,
            weightGrams: $weightGrams,
            amount: $rate->amount,
            currencyCode: $rate->currency_code,
        );

        $this->publish($result);

        return $result;
    }

    private function tryLiveQuote(ShippingMethod $method, string $countryCode, string $region, int $weightGrams): ?ShippingRateQuoteResult
    {
        if ($method->provider_code === null) {
            return null;
        }

        $provider = $this->providerRegistry->get($method->provider_code);

        if ($provider === null || ! $provider->isAvailable() || ! $provider->supportsLiveRateQuote()) {
            return null;
        }

        return $provider->quoteLiveRate(new ShippingRateQuoteRequest(
            originCountryCode: 'BD',
            destinationCountryCode: $countryCode,
            destinationRegion: $region,
            weightGrams: $weightGrams,
        ));
    }

    private function resolveConfiguredRate(ShippingMethod $method, string $countryCode, string $region, int $weightGrams): ?ShippingRate
    {
        if ($region !== '') {
            $specific = $this->findRate($method, $countryCode, $region, $weightGrams);

            if ($specific !== null) {
                return $specific;
            }
        }

        return $this->findRate($method, $countryCode, '', $weightGrams);
    }

    private function findRate(ShippingMethod $method, string $countryCode, string $region, int $weightGrams): ?ShippingRate
    {
        return ShippingRate::query()
            ->where('shipping_method_id', $method->id)
            ->where('status', ShippingRate::STATUS_ACTIVE)
            ->where('min_weight_grams', '<=', $weightGrams)
            ->where(function ($query) use ($weightGrams): void {
                $query->whereNull('max_weight_grams')->orWhere('max_weight_grams', '>', $weightGrams);
            })
            ->whereHas('shippingZone', function ($query) use ($countryCode, $region): void {
                $query->where('country_code', $countryCode)
                    ->where('region', $region)
                    ->where('status', ShippingZone::STATUS_ACTIVE);
            })
            ->orderByDesc('min_weight_grams')
            ->first();
    }

    private function publish(ShippingRateCalculationResult $result): void
    {
        $this->eventBus->publish(new ShippingRateCalculated(
            shippingMethodId: $result->shippingMethodId,
            shippingZoneId: $result->shippingZoneId,
            weightGrams: $result->weightGrams,
            amount: $result->amount,
            currencyCode: $result->currencyCode,
        ));
    }
}
