<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Movement of one SKU between two Warehouses — Phase 2's "full"
     * multi-warehouse depth exercised at Phase 1 schema level already,
     * per the warehouses migration's docblock.
     */
    public function up(): void
    {
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('from_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignUuid('to_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->string('sku');
            $table->unsignedInteger('quantity');
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->index(['from_warehouse_id', 'to_warehouse_id']);
            $table->index('sku');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfers');
    }
};
