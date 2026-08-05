<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Shipment notes" — a free-text, append-only annotation trail an
     * operator adds to a shipment — mirrors Orders' own `order_notes`
     * precedent exactly (see that migration's docblock). `author_id`
     * references Identity & Access's staff User by identifier only, exactly
     * like every other module's `actor_id` audit column. Notes are
     * create-only — no update or delete path exists.
     */
    public function up(): void
    {
        Schema::create('shipment_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('shipment_id');
            $table->uuid('author_id')->nullable();
            $table->text('body');
            $table->boolean('is_customer_visible')->default(false);
            $table->timestamp('created_at');

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->index('shipment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_notes');
    }
};
