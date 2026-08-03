<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Controllers;

use App\Domains\Commerce\Pricing\Actions\CalculateTaxAction;
use App\Domains\Commerce\Pricing\Http\Requests\CalculateTaxRequest;
use App\Domains\Commerce\Pricing\Http\Resources\TaxCalculationResource;

/**
 * MODULE:PRICING's "tax calculation service" Public Contract as its own
 * dedicated endpoint — per planning/IMPLEMENTATION_MASTER_PLAN.md's
 * Pricing & Tax entry. Gated by `pricing.tax.view` (read-only — nothing
 * here mutates state); a future Checkout module will call
 * Actions\CalculateTaxAction directly rather than through this
 * permission-gated HTTP endpoint, the same pattern Installer already
 * established for reusing another module's action directly.
 */
final class TaxCalculationController
{
    public function __construct(private readonly CalculateTaxAction $calculateTaxAction) {}

    public function __invoke(CalculateTaxRequest $request): TaxCalculationResource
    {
        $result = $this->calculateTaxAction->execute(
            taxClassId: $request->string('tax_class_id')->toString(),
            countryCode: $request->string('country_code')->toString(),
            region: $request->string('region', '')->toString(),
            amount: $request->string('amount')->toString(),
        );

        return new TaxCalculationResource($result);
    }
}
