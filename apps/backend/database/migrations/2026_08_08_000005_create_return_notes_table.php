<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Return notes" — a free-text, append-only annotation trail — mirrors
     * Orders' `order_notes` and Fulfillment's `shipment_notes` precedent
     * exactly. `author_id` references Identity & Access's staff User by
     * identifier only. Notes are create-only — no update or delete path
     * exists.
     */
    public function up(): void
    {
        Schema::create('return_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('return_request_id');
            $table->uuid('author_id')->nullable();
            $table->text('body');
            $table->boolean('is_customer_visible')->default(false);
            $table->timestamp('created_at');

            $table->foreign('return_request_id')->references('id')->on('return_requests')->cascadeOnDelete();
            $table->index('return_request_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_notes');
    }
};
