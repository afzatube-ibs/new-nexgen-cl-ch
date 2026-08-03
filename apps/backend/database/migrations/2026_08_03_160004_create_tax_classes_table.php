<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A tax classification a product belongs to (e.g. "Standard",
     * "Reduced", "Zero-Rated", "Exempt") — planning/IMPLEMENTATION_
     * MASTER_PLAN.md's Pricing & Tax entry's "Tax Classes." Products
     * reference a class by identifier (Catalog is a downstream dependent
     * of this module, not the reverse, so no schema-level reference
     * exists here in either direction — see docs/04_MODULE_ARCHITECTURE.md's
     * MODULE:INTERACTION_RULES).
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE. `lock_version`
     * implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary. Tax rule
     * data is Confidential per DATA:CLASSIFICATION, per this module's own
     * Security Considerations entry in the master plan.
     */
    public function up(): void
    {
        Schema::create('tax_classes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'name']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_classes');
    }
};
