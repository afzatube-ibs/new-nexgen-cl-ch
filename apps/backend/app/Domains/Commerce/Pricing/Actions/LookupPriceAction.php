<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Models\PriceListEntry;

/**
 * MODULE:PRICING's "Price lookup" Public Contract, per planning/
 * IMPLEMENTATION_MASTER_PLAN.md's Pricing & Tax entry. Resolves a SKU's
 * current, schedule-aware effective price in a given currency, using that
 * currency's default PriceList — "store pricing support" without this
 * module depending on Store Configuration at all (see the price_lists
 * migration's docblock): the caller resolves a store's own currency_code
 * and passes it here as a plain parameter.
 *
 * neXgen Production Sprint — Milestone 2: delegates to the real, single
 * "resolve the default active price list for a currency" query
 * Actions\LookupPricesAction now owns, so a caller resolving many SKUs
 * (a storefront product grid) and a caller resolving one (this class's
 * own real caller, Checkout's ReviewCheckoutAction) share the identical
 * resolution path — never two independent implementations of the same
 * rule.
 */
final readonly class LookupPriceAction
{
    public function __construct(private LookupPricesAction $lookupPricesAction) {}

    public function execute(string $sku, string $currencyCode): ?PriceListEntry
    {
        return $this->lookupPricesAction->execute([$sku], $currencyCode)[strtoupper($sku)] ?? null;
    }
}
