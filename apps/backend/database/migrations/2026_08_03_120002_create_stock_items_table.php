<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A StockItem is MODULE:INVENTORY's core aggregate: how much of one
     * SKU sits in one Warehouse. Deliberately keyed by `sku` (a string),
     * never by Catalog's Product/ProductVariant id — per DATA:
     * ENTITY_IDENTITY, a SKU is exactly the stable, business-meaningful
     * label both a simple Product and a ProductVariant already expose for
     * this purpose, and keying on it here means Inventory never needs a
     * schema-level (foreign key) reference into Catalog's tables, keeping
     * "Inventory... Depends on Catalog" (04_MODULE_ARCHITECTURE) an
     * event-driven relationship, never a structural one.
     *
     * `quantity_reserved` is maintained transactionally alongside
     * StockReservation rows (never independently computed by summing
     * them on every read) so that ReserveStockAction's oversell check
     * can rely on a single row-locked value — see that action's docblock.
     */
    public function up(): void
    {
        Schema::create('stock_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->string('sku');
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('quantity_reserved')->default(0);
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['warehouse_id', 'sku']);
            $table->index(['tenant_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_items');
    }
};
