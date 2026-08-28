<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Controllers;

use App\Domains\Commerce\Pricing\Actions\LookupPricesAction;
use App\Domains\Commerce\Pricing\Http\Requests\LookupPricesRequest;
use App\Domains\Commerce\Pricing\Http\Resources\PriceListEntryResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * MODULE:PRICING's real, multi-SKU "Price lookup" Public Contract as its
 * own dedicated endpoint — mirrors Operations\Shipping's own
 * ShippingQuoteOptionsController exactly: a real, batched companion to an
 * existing single-item lookup endpoint (PriceLookupController), reusing
 * that lookup's own resolution logic unchanged (Actions\LookupPricesAction).
 * A requested SKU with no configured price in the resolved list is simply
 * absent from the response — never a fabricated null-priced entry.
 */
final class PricesLookupController
{
    public function __construct(private readonly LookupPricesAction $lookupPricesAction) {}

    public function __invoke(LookupPricesRequest $request): AnonymousResourceCollection
    {
        $entries = $this->lookupPricesAction->execute(
            skus: $request->skuList(),
            currencyCode: $request->string('currency_code')->toString(),
        );

        return PriceListEntryResource::collection(array_values($entries));
    }
}
