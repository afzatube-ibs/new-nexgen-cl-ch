<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Http\Controllers;

use App\Domains\Operations\Shipping\Actions\QuoteShippingOptionsAction;
use App\Domains\Operations\Shipping\Http\Requests\QuoteShippingOptionsRequest;
use App\Domains\Operations\Shipping\Http\Resources\ShippingQuoteOptionResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * MODULE:SHIPPING's real, multi-method "delivery estimation" Public
 * Contract — mirrors ShippingRateQuoteController exactly, except it
 * answers "list every method that can ship this" instead of "quote one
 * already-chosen method." Gated by the same read-only
 * `shipping.rates.view` permission — nothing here mutates state, and no
 * new permission is required of any existing caller already trusted to
 * call `POST shipping/quote`.
 */
final class ShippingQuoteOptionsController
{
    public function __construct(private readonly QuoteShippingOptionsAction $quoteShippingOptionsAction) {}

    public function __invoke(QuoteShippingOptionsRequest $request): AnonymousResourceCollection
    {
        $options = $this->quoteShippingOptionsAction->execute(
            countryCode: $request->string('country_code')->toString(),
            region: $request->string('region', '')->toString(),
            weightGrams: (int) $request->integer('weight_grams'),
        );

        return ShippingQuoteOptionResource::collection($options);
    }
}
