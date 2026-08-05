<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers;

use App\Domains\Operations\Shipping\Couriers\Contracts\ShippingProviderContract;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;

/**
 * Self-managed / no courier integration — a first-class provider, not a
 * fallback (mirrors Payments' CodGateway docblock: "Do NOT treat COD as a
 * fallback"). A ShippingMethod with provider_code null or 'manual' is
 * dispatched entirely outside this platform's courier integrations — a
 * merchant's own rider, a walk-in counter, or any arrangement this
 * platform has no reason to know the details of. Genuinely functional: no
 * external network call exists to make, and none is needed for a merchant
 * to operate.
 */
final readonly class ManualProvider implements ShippingProviderContract
{
    public function code(): string
    {
        return 'manual';
    }

    public function label(): string
    {
        return 'Manual / Self-Managed Dispatch';
    }

    public function isAvailable(): bool
    {
        return true;
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
