<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which OptionValue combination a ProductVariant represents (e.g.
     * Color=Red + Size=Large). Uniqueness of the *combination* per product
     * (no two variants of the same product may share an identical set of
     * option values) is an application-level invariant enforced by
     * Actions\AddProductVariantAction — not expressible as a single-column
     * database constraint since it spans a variable number of rows.
     */
    public function up(): void
    {
        Schema::create('product_variant_option_values', function (Blueprint $table) {
            $table->foreignUuid('variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignUuid('option_value_id')->constrained('option_values')->restrictOnDelete();

            $table->primary(['variant_id', 'option_value_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_option_values');
    }
};
