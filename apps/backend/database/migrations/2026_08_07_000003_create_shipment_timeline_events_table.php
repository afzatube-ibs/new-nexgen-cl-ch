<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Shipment timeline" — a chronological, shipment-specific narrative of
     * its business-meaningful moments (created, each status transition,
     * each note added), deliberately separate from `fulfillment_audit_logs`
     * — mirrors Orders' own `order_timeline_events` precedent exactly (see
     * that migration's docblock for the full audit-vs-timeline rationale).
     * Every action that changes a shipment's status, or adds a note, writes
     * exactly one row here alongside its audit log entry, in the same
     * transaction.
     */
    public function up(): void
    {
        Schema::create('shipment_timeline_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('shipment_id');
            $table->string('event_type');
            $table->text('description');
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->index('shipment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_timeline_events');
    }
};
