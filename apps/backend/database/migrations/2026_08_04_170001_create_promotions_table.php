<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:PROMOTIONS' aggregate root — one discount rule, either
     * automatic (`requires_coupon` false) or coupon-gated (redeemed only
     * through a row in `coupons`). Delivered with the full advanced-engine
     * scope planning/IMPLEMENTATION_MASTER_PLAN.md originally deferred to
     * Phase 3, at the Product Owner's explicit direction — see that
     * document's "Promotions & Coupons" entry.
     *
     * `discount_type` is one of percentage/fixed_amount/buy_x_get_y/
     * free_shipping. `discount_value` is the percentage (0-100) or fixed
     * amount, meaningless for buy_x_get_y/free_shipping. `currency_code`
     * is required only for fixed_amount (a fixed discount is denominated
     * in a specific currency, exactly like Pricing's PriceListEntry).
     *
     * The buy_x_/get_y_ columns implement "Buy X Get Y" as first-class
     * fields on the aggregate itself rather than overloading
     * `promotion_conditions`' eligibility-scoping semantics: `buy_x_target_
     * type`/`buy_x_target_id` name what must be purchased (a specific
     * product or category, referenced by identifier only, per ARCH:
     * CROSS_DOMAIN_COMMUNICATION — never a foreign key into Catalog), and
     * `get_y_target_type`/`get_y_target_id` name what becomes discounted;
     * `get_y_discount_percentage` of 100 means "free."
     *
     * `is_stackable` plus `priority` implement "Stackable / non-stackable
     * rules" and "Priority resolution": every stackable promotion that is
     * otherwise eligible applies together; among non-stackable ones, only
     * the single highest-`priority` promotion applies — see Actions\
     * EvaluatePromotionsAction's docblock for the full resolution
     * algorithm.
     *
     * `usage_limit_global`/`usage_count_global` and `usage_limit_per_
     * customer` implement "Usage limits", "Per-customer limits", and
     * "Global limits" for *automatic* promotions. A coupon-gated
     * promotion's redemption count is instead tracked per-code on its own
     * `coupons` row (see that migration's docblock) — deliberately never
     * both, so that exactly one aggregate ever owns the usage-count
     * invariant for a given redemption, keeping every redemption inside a
     * single-aggregate transaction per DATA:TRANSACTION_BOUNDARIES rather
     * than requiring an atomic update to span Promotion and Coupon
     * together. `usage_limit_per_customer` still applies uniformly to
     * both automatic and coupon-gated promotions (checked by counting
     * `promotion_redemptions` rows, not a counter column, since no
     * single row's own concurrency-controlled write governs "how many
     * times this promotion has been redeemed by this specific customer").
     *
     * Future extension points (loyalty points, gift cards, vouchers) can
     * be added as new `discount_type` values without an aggregate
     * redesign, per this module's Future Extension Points entry in the
     * master plan.
     */
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('discount_type');
            $table->decimal('discount_value', 14, 4)->nullable();
            $table->char('currency_code', 3)->nullable();
            $table->unsignedInteger('buy_x_quantity')->nullable();
            $table->string('buy_x_target_type')->nullable();
            $table->uuid('buy_x_target_id')->nullable();
            $table->unsignedInteger('get_y_quantity')->nullable();
            $table->string('get_y_target_type')->nullable();
            $table->uuid('get_y_target_id')->nullable();
            $table->decimal('get_y_discount_percentage', 5, 2)->nullable();
            $table->boolean('is_stackable')->default(false);
            $table->unsignedInteger('priority')->default(0);
            $table->boolean('requires_coupon')->default(false);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('usage_limit_global')->nullable();
            $table->unsignedInteger('usage_count_global')->default(0);
            $table->unsignedInteger('usage_limit_per_customer')->nullable();
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
