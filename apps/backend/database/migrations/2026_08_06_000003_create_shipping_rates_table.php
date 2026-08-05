<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The price charged for a ShippingMethod within a ShippingZone —
     * planning/IMPLEMENTATION_MASTER_PLAN.md's Shipping & Logistics entry
     * names both "Shipping Rates" and "Shipping Rules"; this platform
     * implements them as one concept, exactly as Pricing's tax_rates
     * migration already establishes the precedent for "Tax Rates" and "Tax
     * Rules": a rate with no zone+method assignment has no meaning, and a
     * weight condition with no rate value is incomplete. The weight
     * band (`min_weight_grams`/`max_weight_grams`, nullable-upper-bound)
     * *is* the rule — "$5 flat under 2kg, $9 from 2kg up" is two rows, not
     * a row plus a separately-modeled rule.
     *
     * `min_weight_grams` defaults to 0 and is never null (every rate has a
     * lower bound); `max_weight_grams` null means unbounded ("2kg and
     * up"). Grams rather than a fractional unit keeps the comparison exact
     * integer arithmetic — no floating-point weight-boundary ambiguity.
     *
     * `amount` is a flat charge (e.g. 60.0000 = tax-exclusive currency
     * units), stored with the same precision Pricing's own monetary
     * columns use. `currency_code` is a plain, validated string — see
     * Http\Requests\CreateShippingRateRequest's use of Localization's
     * IsValidCurrencyCode rule — mirroring Pricing's PriceList.currency_code
     * rather than a foreign key, per that model's own precedent.
     *
     * The unique constraint spans (zone, method, min_weight) rather than
     * just (zone, method), so multiple weight-banded rates can coexist for
     * the same zone+method pair; Actions\CalculateShippingRateAction
     * selects the band whose range contains the query weight.
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE. `lock_version`
     * implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary.
     */
    public function up(): void
    {
        Schema::create('shipping_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('shipping_zone_id');
            $table->uuid('shipping_method_id');
            $table->unsignedInteger('min_weight_grams')->default(0);
            $table->unsignedInteger('max_weight_grams')->nullable();
            $table->decimal('amount', 12, 4);
            $table->char('currency_code', 3);
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('shipping_zone_id')->references('id')->on('shipping_zones')->restrictOnDelete();
            $table->foreign('shipping_method_id')->references('id')->on('shipping_methods')->restrictOnDelete();
            $table->unique(['shipping_zone_id', 'shipping_method_id', 'min_weight_grams'], 'shipping_rates_zone_method_band_unique');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_rates');
    }
};
