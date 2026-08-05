<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Order notes" — a free-text, append-only annotation trail an
     * operator adds to an order (e.g. "customer requested gift wrap").
     * `author_id` references Identity & Access's staff User by identifier
     * only, exactly like every other module's `actor_id` audit column.
     * `is_customer_visible` distinguishes an internal-only note from one
     * a future customer-facing order-history view may show; nothing in
     * this module renders that distinction yet, but the column exists so
     * a note's visibility is decided once, when it is written, rather
     * than retrofitted later. Notes are create-only — no update or delete
     * path exists, matching this module's append-only, immutable-history
     * character.
     */
    public function up(): void
    {
        Schema::create('order_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('author_id')->nullable();
            $table->text('body');
            $table->boolean('is_customer_visible')->default(false);
            $table->timestamp('created_at');

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_notes');
    }
};
