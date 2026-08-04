<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Redemption records (per-customer usage tracking)" — an immutable,
     * append-only historical fact recorded every time Actions\
     * RedeemPromotionAction successfully applies a Promotion (and,
     * for coupon-gated ones, a specific Coupon) to a cart. Never updated
     * or deleted, the same immutability discipline DATA:AUDIT_DATA
     * requires of an audit log, though this is business data (per this
     * module's own Data Ownership entry) rather than the audit trail
     * itself — `promotions_audit_logs` is the separate, audit-specific
     * table.
     *
     * `customer_id` and `order_reference` are both opaque, caller-supplied
     * identifiers with no foreign key: `customer_id` references Customers'
     * aggregate by identifier only (per ARCH:CROSS_DOMAIN_COMMUNICATION),
     * and `order_reference` deliberately has no relationship to Checkout
     * or Orders at all — this module "does not couple directly to
     * Checkout or Orders" (per this implementation's explicit
     * requirement), so it never validates or dereferences that string;
     * it exists purely so a future caller can correlate a redemption back
     * to whatever cart/order it belonged to.
     *
     * Written inside the same transaction as the governing aggregate's
     * (Promotion's or Coupon's) usage-count increment — this is the same
     * "audit-adjacent record written alongside the aggregate mutation it
     * documents" pattern this project already uses for every module's own
     * audit log, not a second aggregate DATA:TRANSACTION_BOUNDARIES would
     * require a separate transaction for.
     */
    public function up(): void
    {
        Schema::create('promotion_redemptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('promotion_id');
            $table->uuid('coupon_id')->nullable();
            $table->uuid('customer_id')->nullable();
            $table->string('order_reference')->nullable();
            $table->decimal('discount_amount', 14, 4);
            $table->char('currency_code', 3);
            $table->timestamp('redeemed_at');
            $table->timestamps();

            $table->foreign('promotion_id')->references('id')->on('promotions')->cascadeOnDelete();
            $table->foreign('coupon_id')->references('id')->on('coupons')->nullOnDelete();
            $table->index(['promotion_id', 'customer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_redemptions');
    }
};
