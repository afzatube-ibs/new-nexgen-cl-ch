<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:ORDERS' aggregate root — "the record of what was ordered, at
     * what price, and its status" per planning/IMPLEMENTATION_MASTER_
     * PLAN.md's Orders entry.
     *
     * `customer_id` references Customers' Customer by identifier only —
     * never a foreign key — per ARCH:CROSS_DOMAIN_COMMUNICATION, mirroring
     * Pricing's SKU-keying precedent, even though Customers is (unusually,
     * for this project so far) a real code-level dependency of this
     * module: Actions\CreateOrderAction reads the live Customer record
     * once, at creation time, purely to freeze its current name/email/
     * phone into `customer_name`/`customer_email`/`customer_phone` below —
     * the "Customer snapshot" this module's own requirements name, "so
     * historical orders are not affected by later customer ... changes."
     * The schema itself stays uncoupled regardless of that runtime read.
     *
     * `currency_code` is the "Currency snapshot": the currency the order
     * was placed in, frozen at creation, independent of any later change
     * to a store's or locale's configured currency.
     *
     * `subtotal`/`discount_total`/`tax_total`/`shipping_total`/
     * `grand_total` are "Order totals": subtotal is the sum of every
     * OrderItem's own line subtotal (unit_price * quantity) before
     * adjustment; discount_total is the sum of every OrderDiscount;
     * tax_total is the sum of every OrderItem's tax_amount; grand_total =
     * subtotal - discount_total + tax_total + shipping_total. Orders
     * never calculates any of these from scratch — they are computed by
     * summing the line-level figures a caller (the future Checkout
     * module, which has already called Pricing's and Promotions' own
     * calculation services) supplies at creation time, per this module's
     * "records the outcome of pricing and promotion decisions ... never
     * recalculates them independently" Security Consideration.
     *
     * `status` is the "Order status lifecycle" — see Models\Order's
     * docblock for the full state graph.
     *
     * Deliberately has NO soft-delete column, unlike every other
     * aggregate root in this project: an Order is an immutable financial
     * and historical record, not a resource that is ever "deleted" in
     * DATA:LIFECYCLE's ordinary Active/Archived/Deleted sense — its
     * lifecycle is entirely the `status` state machine, and CANCELLED is
     * the terminal state that plays the role deletion plays elsewhere.
     * No delete endpoint exists anywhere in this module.
     *
     * `lock_version` implements DATA:VERSIONING for the whole aggregate,
     * including item/address/discount changes at creation and every
     * status transition afterward.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('order_number');
            $table->uuid('customer_id');
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone')->nullable();
            $table->char('currency_code', 3);
            $table->decimal('subtotal', 14, 4);
            $table->decimal('discount_total', 14, 4)->default(0);
            $table->decimal('tax_total', 14, 4)->default(0);
            $table->decimal('shipping_total', 14, 4)->default(0);
            $table->decimal('grand_total', 14, 4);
            $table->string('status')->default('pending');
            $table->timestamp('placed_at');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->unique('order_number');
            $table->index(['tenant_id', 'status']);
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
