<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Directed relationships between two products — related, cross-sell,
     * up-sell — per planning/IMPLEMENTATION_MASTER_PLAN.md's "Product
     * Relationships" requirement. Directed deliberately: a cross-sell from
     * A to B does not imply the reverse.
     */
    public function up(): void
    {
        Schema::create('product_relationships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('related_product_id')->constrained('products')->cascadeOnDelete();
            $table->string('type');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'related_product_id', 'type']);
            $table->index('related_product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_relationships');
    }
};
