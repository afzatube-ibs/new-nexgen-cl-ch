<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Order items" — one purchased line, written once when the order is
     * placed and never updated afterward (an order is immutable history,
     * per the orders migration's docblock), so this carries no
     * `lock_version` at all — not even a parent-versioned one, since
     * unlike Customers' CustomerAddress or Promotions' PromotionCondition,
     * nothing ever mutates a single OrderItem in place after creation.
     *
     * `product_id` references Catalog's Product by identifier only, and
     * `sku`/`product_name` are a snapshot of that product's identity at
     * order time, supplied by the caller (the future Checkout module,
     * which already resolved them from Catalog) rather than looked up
     * here — Orders has no code-level dependency on Catalog at all, per
     * this module's Dependencies entry in docs/04_MODULE_ARCHITECTURE.md.
     *
     * `unit_price` is the price actually paid per unit, already resolved
     * by Pricing before the order existed; `discount_amount`/`tax_amount`
     * are this line's own share of the order's discount/tax, already
     * resolved by Promotions/Pricing — Orders sums these into its own
     * totals but never calculates them.
     */
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('product_id');
            $table->string('sku');
            $table->string('product_name');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 14, 4);
            $table->decimal('discount_amount', 14, 4)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('line_subtotal', 14, 4);
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index(['order_id']);
            $table->index('sku');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
