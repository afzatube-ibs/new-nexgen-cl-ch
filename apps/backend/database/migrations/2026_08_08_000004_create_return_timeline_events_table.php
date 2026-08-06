<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Return timeline" — a chronological, request-specific narrative of
     * its business-meaningful moments, deliberately separate from
     * `returns_audit_logs` — mirrors Orders' `order_timeline_events` and
     * Fulfillment's `shipment_timeline_events` precedent exactly (see
     * either migration's docblock for the full audit-vs-timeline
     * rationale).
     */
    public function up(): void
    {
        Schema::create('return_timeline_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('return_request_id');
            $table->string('event_type');
            $table->text('description');
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->foreign('return_request_id')->references('id')->on('return_requests')->cascadeOnDelete();
            $table->index('return_request_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_timeline_events');
    }
};
