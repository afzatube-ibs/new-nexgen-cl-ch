<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A line item within a ReturnRequest — part of this aggregate itself
     * (`return_request_id` is a real foreign key: this table and
     * `return_requests` are both owned by Returns). `sku` deliberately
     * references Catalog by plain string identifier only, never a foreign
     * key — mirrors Inventory's `stock_items.sku` and Fulfillment's
     * `shipment_items.sku` precedent exactly. Operator/customer-entered,
     * since Returns has no lawful way to read Orders' own line items
     * directly.
     */
    public function up(): void
    {
        Schema::create('return_request_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('return_request_id');
            $table->string('sku');
            $table->string('description')->nullable();
            $table->unsignedInteger('quantity');
            $table->timestamps();

            $table->foreign('return_request_id')->references('id')->on('return_requests')->cascadeOnDelete();
            $table->index('return_request_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_request_items');
    }
};
