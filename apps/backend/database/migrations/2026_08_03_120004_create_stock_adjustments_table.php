<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * An immutable record of every manual/system correction to a
     * StockItem's `quantity_on_hand` — per SECURITY:AUDIT_LOGGING's floor
     * for stock manipulation ("a direct fraud vector — full audit trail")
     * made concrete as first-class, queryable movement history, not only
     * this module's generic audit log. `actor_id` mirrors every other
     * audit-shaped table's identifier-only cross-module reference.
     */
    public function up(): void
    {
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('stock_item_id')->constrained('stock_items')->restrictOnDelete();
            $table->integer('quantity_delta');
            $table->string('reason');
            $table->uuid('actor_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('stock_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');
    }
};
