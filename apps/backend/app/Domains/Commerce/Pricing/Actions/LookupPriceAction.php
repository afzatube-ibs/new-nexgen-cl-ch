<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;

/**
 * MODULE:PRICING's "Price lookup" Public Contract, per planning/
 * IMPLEMENTATION_MASTER_PLAN.md's Pricing & Tax entry. Resolves a SKU's
 * current, schedule-aware effective price in a given currency, using that
 * currency's default PriceList — "store pricing support" without this
 * module depending on Store Configuration at all (see the price_lists
 * migration's docblock): the caller resolves a store's own currency_code
 * and passes it here as a plain parameter.
 */
final readonly class LookupPriceAction
{
    public function execute(string $sku, string $currencyCode): ?PriceListEntry
    {
        $priceList = PriceList::query()
            ->where('currency_code', strtoupper($currencyCode))
            ->where('is_default', true)
            ->where('status', PriceList::STATUS_ACTIVE)
            ->first();

        if ($priceList === null) {
            return null;
        }

        return $priceList->entries()->where('sku', strtoupper($sku))->first();
    }
}
