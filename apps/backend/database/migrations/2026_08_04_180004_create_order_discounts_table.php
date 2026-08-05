<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Discounts" broken out per promotion applied — the order's own
     * `discount_total` is simply the sum of these rows. `promotion_id`
     * references Promotions' Promotion by identifier only, and `code`/
     * `label` are a snapshot of that promotion's coupon code and display
     * name at the moment it was applied, supplied by the caller (which
     * already evaluated and redeemed it via Promotions' own Actions\
     * EvaluatePromotionsAction/RedeemPromotionAction before the order
     * existed) — so a later rename or deletion of the Promotion never
     * changes what this historical order says was discounted, and why.
     * No `lock_version`: written once at order creation, never updated.
     */
    public function up(): void
    {
        Schema::create('order_discounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('promotion_id')->nullable();
            $table->string('code')->nullable();
            $table->string('label');
            $table->decimal('amount', 14, 4);
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_discounts');
    }
};
