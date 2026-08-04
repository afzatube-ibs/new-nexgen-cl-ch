<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Manual coupon codes" — a redeemable code gating a coupon-required
     * Promotion. One Promotion may have several Coupon codes (e.g. a
     * campaign issuing distinct codes per channel), so this is a
     * one-to-many child table, not a single column on `promotions`.
     *
     * Carries its own `lock_version`, unlike `promotion_conditions`: a
     * coupon code's `usage_count_global` is mutated under real concurrent
     * write pressure (many simultaneous redemption attempts racing
     * against the same code's limit), which is exactly the kind of
     * per-row invariant DATA:AGGREGATE_BOUNDARIES calls out as requiring
     * its own version — the same reasoning that gave Pricing's
     * PriceListEntry its own `lock_version` rather than sharing its
     * parent's. See the promotions migration's docblock for why a
     * coupon-gated promotion's usage is tracked here instead of on
     * `promotions.usage_count_global`, never both.
     *
     * `code` is normalized to uppercase on save (mirrors Pricing's SKU
     * normalization) and unique per tenant.
     */
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('promotion_id');
            $table->string('code');
            $table->unsignedInteger('usage_limit_global')->nullable();
            $table->unsignedInteger('usage_count_global')->default(0);
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('promotion_id')->references('id')->on('promotions')->cascadeOnDelete();
            $table->unique(['tenant_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
