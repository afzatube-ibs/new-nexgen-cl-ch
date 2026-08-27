<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * neXgen Overnight Sprint — Milestone 1, Objective 1 (Checkout →
     * Shipping Integration). A real shipping-rate quote
     * (Operations\Shipping\Actions\CalculateShippingRateAction) requires a
     * real parcel weight; until now Catalog tracked none at all, which is
     * exactly why Checkout's own shipping selection could never be more
     * than a flat, weight-blind guess. Nullable and additive: an existing
     * product with no weight recorded yet simply cannot be weight-quoted
     * until an operator sets one — never a fabricated default written to
     * this column.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('weight_grams')->nullable()->after('product_type');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('weight_grams');
        });
    }
};
