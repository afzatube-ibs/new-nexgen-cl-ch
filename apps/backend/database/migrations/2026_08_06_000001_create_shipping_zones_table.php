<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A geographic delivery jurisdiction — MODULE:SHIPPING's own zone
     * concept, per planning/IMPLEMENTATION_MASTER_PLAN.md's Shipping &
     * Logistics entry ("Shipping method setup, rate calculation, carrier
     * rate integration"). Mirrors Pricing's tax_zones migration exactly,
     * including why `region` is a plain string, empty rather than nullable,
     * for a country-wide zone (country_code=BD, region='') to coexist with
     * a division/district-specific zone (country_code=BD, region=Dhaka)
     * under the same unique constraint — MySQL treats NULL as distinct from
     * every other NULL in a unique index, so a nullable region would
     * silently allow duplicate country-wide zones.
     * Actions\CalculateShippingRateAction matches the more specific zone
     * first, falling back to the country-wide one, per that action's own
     * docblock.
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE. `lock_version`
     * implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary. Shipping
     * zone configuration is Internal per DATA:CLASSIFICATION, matching this
     * module's own Data Ownership entry in the master plan.
     */
    public function up(): void
    {
        Schema::create('shipping_zones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->char('country_code', 2);
            $table->string('region')->default('');
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'country_code', 'region']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_zones');
    }
};
