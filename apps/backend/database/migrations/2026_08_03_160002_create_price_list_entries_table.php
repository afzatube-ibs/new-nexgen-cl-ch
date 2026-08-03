<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One SKU's pricing within a PriceList — deliberately keyed by `sku`
     * rather than a foreign key into Catalog's `products`/`product_
     * variants` tables, mirroring Inventory's own StockItem precedent
     * (see that migration's docblock): this keeps "Pricing depends on
     * Catalog" a reference-by-identifier relationship rather than a
     * schema-level coupling, per ARCH:CROSS_DOMAIN_COMMUNICATION.
     *
     * `base_price` is the standing price; `compare_at_price` is the
     * optional "was" price shown alongside it (planning/IMPLEMENTATION_
     * MASTER_PLAN.md's "Compare Price"); `sale_price` with
     * `sale_starts_at`/`sale_ends_at` implements "Sale Price" and
     * "Scheduled Pricing" together as one mechanism — a sale is simply a
     * second price active only within its own date window, never a
     * discount *rule*. This is the boundary this module's own Acceptance
     * Criteria names explicitly: "Pricing and Promotions remain separate
     * modules with Promotions only ever adjusting, never replacing,
     * Pricing's base value" — nothing here is conditional, tiered, or
     * coupon-triggered; it is still just a price this module directly
     * sets, exactly like `base_price`.
     *
     * One entry per (price_list_id, sku) — the unique constraint below is
     * the actual invariant enforcement (an upsert-shaped create/update,
     * not a sibling-clearing pattern), so this table deliberately carries
     * its own `lock_version`: unlike Customers' address book, there is no
     * cross-row invariant spanning multiple entries in the same list (no
     * "at most one default" scan required), so DATA:AGGREGATE_BOUNDARIES'
     * "smallest set of data that genuinely must be consistent at every
     * moment" does not require versioning through a shared parent.
     */
    public function up(): void
    {
        Schema::create('price_list_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('price_list_id');
            $table->string('sku');
            $table->decimal('base_price', 14, 4);
            $table->decimal('compare_at_price', 14, 4)->nullable();
            $table->decimal('sale_price', 14, 4)->nullable();
            $table->timestamp('sale_starts_at')->nullable();
            $table->timestamp('sale_ends_at')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('price_list_id')->references('id')->on('price_lists')->cascadeOnDelete();
            $table->unique(['price_list_id', 'sku']);
            $table->index('sku');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_list_entries');
    }
};
