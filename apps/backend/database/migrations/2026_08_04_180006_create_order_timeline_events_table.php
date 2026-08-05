<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Order timeline" — a chronological, order-specific narrative of its
     * business-meaningful moments (placed, each status transition, each
     * note added), deliberately separate from `orders_audit_logs`: the
     * audit log is DATA:AUDIT_DATA's technical/security mutation trail
     * (Confidential, staff-only, structurally identical to every other
     * module's); the timeline is a business-readable story of the order's
     * life, the shape a future customer-facing order-status page would
     * actually want to render. Every action that changes an order's
     * status, or adds a note, writes exactly one row here alongside its
     * audit log entry, in the same transaction.
     */
    public function up(): void
    {
        Schema::create('order_timeline_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('event_type');
            $table->text('description');
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_timeline_events');
    }
};
