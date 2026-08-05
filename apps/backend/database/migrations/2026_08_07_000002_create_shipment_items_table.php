<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A line item within a Shipment — part of this aggregate itself
     * (`shipment_id` is a real foreign key: this table and `shipments` are
     * both owned by Fulfillment, unlike every cross-module identifier
     * elsewhere in this module). `sku` deliberately references Catalog by
     * plain string identifier only, never a foreign key — mirrors
     * Inventory's own `stock_items.sku` precedent (see that migration's
     * docblock: "keeping the 'Inventory depends on Catalog' relationship
     * event-driven, not structural"). Operator-entered, per this module's
     * "manual fulfillment actions" Public Contract — Fulfillment has no
     * lawful way to read Orders' own line items directly.
     */
    public function up(): void
    {
        Schema::create('shipment_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('shipment_id');
            $table->string('sku');
            $table->string('description')->nullable();
            $table->unsignedInteger('quantity');
            $table->timestamps();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->index('shipment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_items');
    }
};
