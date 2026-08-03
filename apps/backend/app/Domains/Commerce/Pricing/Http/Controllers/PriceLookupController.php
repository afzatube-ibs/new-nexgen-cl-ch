<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Controllers;

use App\Domains\Commerce\Pricing\Actions\LookupPriceAction;
use App\Domains\Commerce\Pricing\Http\Requests\LookupPriceRequest;
use App\Domains\Commerce\Pricing\Http\Resources\PriceListEntryResource;
use Illuminate\Http\JsonResponse;

/**
 * MODULE:PRICING's "Price lookup" Public Contract as its own dedicated
 * endpoint, distinct from PriceListEntry CRUD — per planning/
 * IMPLEMENTATION_MASTER_PLAN.md's Pricing & Tax entry.
 */
final class PriceLookupController
{
    public function __construct(private readonly LookupPriceAction $lookupPriceAction) {}

    public function __invoke(LookupPriceRequest $request): JsonResponse
    {
        $entry = $this->lookupPriceAction->execute(
            sku: $request->string('sku')->toString(),
            currencyCode: $request->string('currency_code')->toString(),
        );

        if ($entry === null) {
            return response()->json(['data' => null]);
        }

        return (new PriceListEntryResource($entry))->response();
    }
}
