<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The rate applied when a TaxClass is taxed within a TaxZone —
     * planning/IMPLEMENTATION_MASTER_PLAN.md's Pricing & Tax entry names
     * both "Tax Rates" and "Tax Rules"; this platform implements them as
     * one concept, since a rate with no zone+class assignment has no
     * meaning and an assignment with no rate value is incomplete — the
     * unique (tax_zone_id, tax_class_id) constraint below *is* the rule.
     *
     * `rate` is a percentage (e.g. 8.5000 means 8.5%), stored with enough
     * precision to represent real-world jurisdiction rates exactly.
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE. `lock_version`
     * implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary. Tax rule
     * data is Confidential per DATA:CLASSIFICATION, per this module's own
     * Security Considerations entry in the master plan.
     */
    public function up(): void
    {
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('tax_zone_id');
            $table->uuid('tax_class_id');
            $table->decimal('rate', 8, 4);
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tax_zone_id')->references('id')->on('tax_zones')->restrictOnDelete();
            $table->foreign('tax_class_id')->references('id')->on('tax_classes')->restrictOnDelete();
            $table->unique(['tax_zone_id', 'tax_class_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_rates');
    }
};
