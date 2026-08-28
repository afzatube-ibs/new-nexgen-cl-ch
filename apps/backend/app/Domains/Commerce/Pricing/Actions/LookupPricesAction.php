<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;

/**
 * MODULE:PRICING's real, multi-SKU "Price lookup" Public Contract — the
 * batch companion to Actions\LookupPriceAction's own single-SKU quote,
 * built for a real storefront product grid that needs to price N products
 * in one call rather than N (the exact same "batch the multi-item quote,
 * reuse the single-item resolution's own logic" shape Operations\Shipping's
 * own QuoteShippingOptionsAction already established for shipping quotes).
 *
 * The single-SKU LookupPriceAction now delegates here rather than the
 * reverse (a loop calling it once per SKU), so this remains the one real
 * "resolve the default active price list for a currency" query — never
 * duplicated, never re-run once per SKU.
 */
final readonly class LookupPricesAction
{
    /**
     * @param  list<string>  $skus
     * @return array<string, PriceListEntry> keyed by uppercased SKU — a SKU with no entry in the resolved price list is simply absent, never a fabricated null-priced placeholder.
     */
    public function execute(array $skus, string $currencyCode): array
    {
        $normalizedSkus = array_values(array_unique(array_map(strtoupper(...), $skus)));

        if ($normalizedSkus === []) {
            return [];
        }

        $priceList = PriceList::query()
            ->where('currency_code', strtoupper($currencyCode))
            ->where('is_default', true)
            ->where('status', PriceList::STATUS_ACTIVE)
            ->first();

        if ($priceList === null) {
            return [];
        }

        $entries = $priceList->entries()->whereIn('sku', $normalizedSkus)->get();

        $result = [];
        foreach ($entries as $entry) {
            $result[strtoupper($entry->sku)] = $entry;
        }

        return $result;
    }
}
