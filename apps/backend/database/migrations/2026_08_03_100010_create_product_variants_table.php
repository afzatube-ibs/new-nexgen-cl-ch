<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A ProductVariant is the actual sellable unit for a `configurable`
     * Product — the concrete combination of OptionValues (see
     * product_variant_option_values below) with its own SKU/barcode.
     * A `simple` or `digital` Product has no variants; its own SKU on the
     * products table is what Inventory/Orders (future modules) key off of
     * directly.
     *
     * Deliberately its own aggregate (own `lock_version`, own soft delete)
     * rather than folded into Product's: a variant can be individually
     * discontinued (e.g. "size XL retired") without touching the parent
     * Product's own version or lifecycle, and concurrent edits to two
     * different variants of the same product must not conflict with each
     * other, per DATA:AGGREGATE_BOUNDARIES' "smallest set of data that
     * genuinely must be consistent at every moment."
     */
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku');
            $table->string('barcode')->nullable();
            $table->string('status')->default('active');
            $table->unsignedInteger('position')->default(0);
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'sku']);
            $table->index('product_id');
            $table->index('barcode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
