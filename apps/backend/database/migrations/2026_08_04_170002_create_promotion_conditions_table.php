<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Promotion's eligibility scope — "Promotion conditions", "Category
     * promotions", "Product promotions", "Customer-specific promotions",
     * and "Store-specific promotions" are all implemented as rows here,
     * distinguished by `condition_type` (product/category/customer/store/
     * minimum_order_amount). `reference_id` holds the referenced Catalog
     * product/category id, Customers customer id, or Store Configuration
     * store id — by identifier only, never a foreign key into another
     * module's table, per ARCH:CROSS_DOMAIN_COMMUNICATION (mirrors
     * Pricing's PriceListEntry.sku precedent exactly). `numeric_value`
     * holds the minimum-order-amount threshold and is unused by every
     * other condition_type.
     *
     * Evaluation semantics (see Actions\EvaluatePromotionsAction): within
     * one condition_type, conditions are OR'd ("any of these products");
     * across different condition_types present on the same promotion,
     * groups are AND'd ("this product AND this customer"). A promotion
     * with no conditions at all is cart-wide eligible.
     *
     * No own `lock_version`: conditions are versioned through the parent
     * Promotion, exactly like Customers' CustomerAddress — the set of
     * conditions collectively defines one aggregate's eligibility rule,
     * with no cross-row invariant that would justify an independent lock
     * the way PriceListEntry's per-SKU uniqueness did.
     */
    public function up(): void
    {
        Schema::create('promotion_conditions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('promotion_id');
            $table->string('condition_type');
            $table->uuid('reference_id')->nullable();
            $table->decimal('numeric_value', 14, 4)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('promotion_id')->references('id')->on('promotions')->cascadeOnDelete();
            $table->index(['promotion_id', 'condition_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_conditions');
    }
};
