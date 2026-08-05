<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Controllers;

use App\Domains\Operations\Shipping\Actions\CalculateShippingRateAction;
use App\Domains\Operations\Shipping\Http\Requests\QuoteShippingRateRequest;
use App\Domains\Operations\Shipping\Http\Resources\ShippingRateQuoteResource;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * MODULE:SHIPPING's "rate query" Public Contract as its own dedicated
 * endpoint — mirrors Pricing's TaxCalculationController exactly. Gated by
 * `shipping.rates.view` (read-only — nothing here mutates state).
 *
 * A null Actions\CalculateShippingRateAction result (no configured rate
 * covers this method+destination+weight) surfaces as a plain 404 — see
 * that action's own docblock for why this is never silently resolved to a
 * zero-cost quote.
 */
final class ShippingRateQuoteController
{
    public function __construct(private readonly CalculateShippingRateAction $calculateShippingRateAction) {}

    public function __invoke(QuoteShippingRateRequest $request): ShippingRateQuoteResource
    {
        $result = $this->calculateShippingRateAction->execute(
            shippingMethodId: $request->string('shipping_method_id')->toString(),
            countryCode: $request->string('country_code')->toString(),
            region: $request->string('region', '')->toString(),
            weightGrams: (int) $request->integer('weight_grams'),
        );

        if ($result === null) {
            throw new NotFoundHttpException('No shipping rate is configured for this method, destination, and weight.');
        }

        return new ShippingRateQuoteResource($result);
    }
}
