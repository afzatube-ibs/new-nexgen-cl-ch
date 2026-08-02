<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:INVENTORY's location aggregate — Phase 1 exercises a single
     * default warehouse; the schema already carries everything Phase 2
     * multi-warehouse needs (this table itself, plus StockItem's
     * warehouse_id dimension), so that phase narrows an already-present
     * shape rather than requiring a redesign — the same pattern Store
     * Configuration's tenant_id and Catalog's schema both already follow.
     */
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('code');
            $table->string('name');
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable();
            $table->string('region')->nullable();
            $table->string('postal_code')->nullable();
            $table->char('country_code', 2)->nullable();
            $table->boolean('is_default')->default(false);
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
