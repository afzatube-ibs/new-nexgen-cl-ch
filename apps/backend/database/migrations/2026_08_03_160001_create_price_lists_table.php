<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A PriceList is MODULE:PRICING's aggregate root for base pricing —
     * planning/IMPLEMENTATION_MASTER_PLAN.md's Pricing & Tax entry names
     * both "Price Lists" and "Price Books"; this platform implements them
     * as one concept (real commerce platforms use the two terms for the
     * same thing — a named, currency-scoped collection of prices), rather
     * than inventing two redundant mechanisms for identical scope.
     *
     * `currency_code` makes pricing currency-aware per that same entry's
     * "Currency-aware pricing" requirement; validated against Localization
     * & Currency's curated ISO 4217 list (a declared dependency — see
     * Http\Requests\CreatePriceListRequest) rather than duplicating that
     * list a further time. `is_default` implements the single-default-per-
     * currency invariant enforced in Actions\UpdatePriceListAction (at
     * most one default list per currency, since "the default list for
     * USD" and "the default list for EUR" are independent facts).
     *
     * "Store pricing support" is satisfied without this module depending
     * on Store Configuration at all (not a declared dependency — see
     * docs/04_MODULE_ARCHITECTURE.md's MODULE:PRICING entry, "Depends on
     * Catalog" only, and the master plan's "Catalog, Localization &
     * Currency"): a caller resolves a store's own currency_code (Store
     * Configuration's data) and passes it to this module's lookup
     * contract as a plain parameter, per DATA:CROSS_MODULE_ACCESS.
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE. `lock_version`
     * implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary. Base
     * pricing data is Confidential per DATA:CLASSIFICATION, per this
     * module's own Security Considerations entry in the master plan.
     */
    public function up(): void
    {
        Schema::create('price_lists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->char('currency_code', 3);
            $table->boolean('is_default')->default(false);
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'currency_code']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_lists');
    }
};
