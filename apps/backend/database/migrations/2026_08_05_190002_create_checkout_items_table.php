<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One cart line within a CheckoutSession — see that migration's
     * docblock. Unlike Orders' OrderItem (write-once, immutable history),
     * a CheckoutItem is mutable for as long as its session is `open` or
     * `reviewed`: Actions\UpdateCheckoutItemAction changes `quantity`,
     * Actions\RemoveCheckoutItemAction deletes the row outright. No own
     * `lock_version` — versioned through the parent CheckoutSession
     * exactly like Customers' CustomerAddress and Promotions'
     * PromotionCondition, since no cross-row invariant among a session's
     * own items requires independent concurrency control.
     *
     * `product_id`/`sku`/`product_name`/`category_ids` are a snapshot
     * resolved from Catalog once, when the item is added (Actions\
     * AddCheckoutItemAction) — `category_ids` exists purely to build
     * Promotions' own Support\CartLineItem at review/submit time, per
     * that class's documented shape. `tax_class_id` is supplied by the
     * caller (see Actions\AddCheckoutItemAction's docblock for why: no
     * module in this codebase yet links a Catalog product to a Pricing
     * TaxClass, so Checkout cannot resolve one on the caller's behalf
     * without inventing data ownership that belongs to neither module);
     * a line with no `tax_class_id` is simply untaxed, the same
     * "no matching configuration is a valid zero-value outcome, not an
     * error" principle Pricing's own CalculateTaxAction already applies.
     *
     * `unit_price`/`tax_amount` are null until Actions\
     * ReviewCheckoutAction resolves them via Pricing's LookupPriceAction
     * and CalculateTaxAction.
     */
    public function up(): void
    {
        Schema::create('checkout_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('checkout_session_id');
            $table->uuid('product_id');
            $table->string('sku');
            $table->string('product_name');
            $table->json('category_ids')->nullable();
            $table->unsignedInteger('quantity');
            $table->uuid('tax_class_id')->nullable();
            $table->decimal('unit_price', 14, 4)->nullable();
            $table->decimal('tax_amount', 14, 4)->nullable();
            $table->timestamps();

            $table->foreign('checkout_session_id')->references('id')->on('checkout_sessions')->cascadeOnDelete();
            $table->unique(['checkout_session_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkout_items');
    }
};
