<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:CHECKOUT's aggregate root — "the in-progress purchase flow
     * before it becomes an Order" per planning/IMPLEMENTATION_MASTER_
     * PLAN.md's Checkout entry. Data Ownership: Temporary per DATA:
     * CLASSIFICATION — see `expires_at` below and Console\Commands\
     * ExpireCheckoutSessionsCommand for how this module keeps its own
     * promise that "abandoned sessions do not accumulate indefinitely."
     *
     * `customer_id` (identifier-only, no foreign key, per ARCH:CROSS_
     * DOMAIN_COMMUNICATION) is set for a registered-customer session;
     * `guest_email`/`guest_name` are set instead for a guest session —
     * exactly one of the two shapes is populated, enforced by Actions\
     * StartCheckoutAction, not by the schema. Actions\SubmitCheckoutAction
     * resolves a guest session to a real Customer (existing or newly
     * registered via Customers' own RegisterCustomerAction) only at
     * submission time — this module never invents its own notion of
     * "customer."
     *
     * `billing_address`/`shipping_address` are JSON snapshots (not a
     * child table, unlike Orders' OrderAddress): this data is Temporary
     * and short-lived by definition, so the relational rigor a permanent
     * historical record needs is not justified here. Each is either
     * copied from an entry in the customer's own address book or
     * supplied inline, per Actions\SetCheckoutAddressAction — resolved
     * once, at the moment it is set, exactly like Orders' own address-
     * snapshot resolution.
     *
     * `shipping_option_id`/`shipping_total` come from this module's own
     * small, hardcoded Support\ShippingOptionCatalog — the seam a future
     * Shipping & Logistics module replaces without changing this table's
     * shape (see that class's docblock).
     *
     * `subtotal`/`discount_total`/`tax_total`/`grand_total` are null
     * until Actions\ReviewCheckoutAction populates them — "Checkout
     * review" is a distinct, explicit step (see Models\CheckoutSession's
     * status graph), not something submission computes on the fly.
     *
     * `idempotency_key` and `order_id` are set only once, by Actions\
     * SubmitCheckoutAction, and never before — see that class's docblock
     * for the full duplicate-submission-protection design (a saga of
     * single-aggregate transactions, per DATA:TRANSACTION_BOUNDARIES,
     * not one transaction spanning this module's aggregate and Orders',
     * Inventory's, and Promotions' aggregates at once).
     *
     * `lock_version` implements DATA:VERSIONING for the whole aggregate,
     * including item changes (see the checkout_items migration's
     * docblock for why items are versioned through this parent).
     */
    public function up(): void
    {
        Schema::create('checkout_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('customer_id')->nullable();
            $table->string('guest_email')->nullable();
            $table->string('guest_name')->nullable();
            $table->char('currency_code', 3);
            $table->json('billing_address')->nullable();
            $table->json('shipping_address')->nullable();
            $table->string('shipping_option_id')->nullable();
            $table->decimal('shipping_total', 14, 4)->nullable();
            $table->string('coupon_code')->nullable();
            $table->decimal('subtotal', 14, 4)->nullable();
            $table->decimal('discount_total', 14, 4)->nullable();
            $table->decimal('tax_total', 14, 4)->nullable();
            $table->decimal('grand_total', 14, 4)->nullable();
            $table->string('status')->default('open');
            $table->string('idempotency_key')->nullable();
            $table->uuid('order_id')->nullable();
            $table->timestamp('expires_at');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->unique('idempotency_key');
            $table->index(['tenant_id', 'status']);
            $table->index('customer_id');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkout_sessions');
    }
};
