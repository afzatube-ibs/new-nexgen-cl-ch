<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A distinct aggregate root, created once a ReturnRequest of type
     * `exchange` is resolved — same DATA:AGGREGATE_BOUNDARIES reasoning as
     * Models\RefundRequest (an independently-triggered lifecycle earns its
     * own consistency boundary).
     *
     * Deliberately basic, per planning/IMPLEMENTATION_MASTER_PLAN.md's own
     * "Phase: 1 (basic) / Phase 2 (exchanges)" split and its Future
     * Extension Points line ("Exchange-specific inventory reservation
     * logic (Phase 2) extends this without redesign"): this table records
     * WHAT the customer wants instead (`desired_sku`/`desired_quantity`)
     * and tracks the replacement's own dispatch status, but performs no
     * Inventory reservation and creates no Fulfillment Shipment
     * automatically — an operator handles the physical reshipment through
     * Fulfillment's own existing, unrelated API, exactly the same
     * intentional decoupling this module already uses for pickup
     * collection (Models\ReturnRequest's own `pickup_*` columns).
     *
     * `return_request_id` is a real foreign key (same aggregate family).
     * No soft delete — a permanent record per DATA:RETENTION.
     */
    public function up(): void
    {
        Schema::create('exchange_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('return_request_id');
            $table->string('desired_sku');
            $table->string('desired_description')->nullable();
            $table->unsignedInteger('desired_quantity');
            $table->string('status')->default('pending');
            $table->string('tracking_number')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->foreign('return_request_id')->references('id')->on('return_requests')->restrictOnDelete();
            $table->index('return_request_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_requests');
    }
};
