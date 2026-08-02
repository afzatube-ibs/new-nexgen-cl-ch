<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A temporary hold against a StockItem's available quantity —
     * DATA:CLASSIFICATION's Temporary category, per the same reasoning
     * Checkout's own future session data will use. `reference_type`/
     * `reference_id` are a generic external-reference pair (never a
     * foreign key) so this module can be reserved against today, before
     * the future Checkout module that will actually create most
     * reservations exists — exactly the kind of forward-compatible,
     * undecided-consumer shape DATA:CROSS_MODULE_ACCESS's identifier-
     * reference pattern is for.
     */
    public function up(): void
    {
        Schema::create('stock_reservations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('stock_item_id')->constrained('stock_items')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->string('reference_type')->nullable();
            $table->string('reference_id')->nullable();
            $table->string('status')->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('stock_item_id');
            $table->index(['reference_type', 'reference_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_reservations');
    }
};
