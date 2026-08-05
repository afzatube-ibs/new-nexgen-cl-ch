<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;

/**
 * Sundarban Courier Service — a long-established Bangladesh nationwide
 * courier that, as of this module's implementation, publishes no public
 * merchant API (confirmed: no official developer documentation exists,
 * unlike Steadfast, Pathao, RedX, Paperfly, and eCourier). Per PRINCIPLES:
 * EXPLICIT_FAILURE, this provider is registered for identity/selection
 * purposes only — a ShippingMethod may reference `sundarban` as its
 * provider_code for offline/manually-arranged dispatch tracking — and
 * isAvailable() always reports false, honestly, rather than fabricating an
 * integration that does not exist. Should Sundarban publish a merchant API
 * in the future, this class becomes a genuine integration (mirroring
 * Steadfast's own shape) with no change to Models\ShippingMethod, any
 * Action, or any controller — exactly the extensibility this contract
 * exists to guarantee.
 */
final readonly class SundarbanProvider implements ShippingProviderContract
{
    public function code(): string
    {
        return 'sundarban';
    }

    public function label(): string
    {
        return 'Sundarban Courier Service';
    }

    public function isAvailable(): bool
    {
        return false;
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
