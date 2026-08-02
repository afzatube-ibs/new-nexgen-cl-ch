<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which Options define a `configurable` Product's variant dimensions
     * (e.g. this product varies by Color and Size, but not Material).
     */
    public function up(): void
    {
        Schema::create('product_options', function (Blueprint $table) {
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('option_id')->constrained('options')->restrictOnDelete();
            $table->unsignedInteger('position')->default(0);

            $table->primary(['product_id', 'option_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_options');
    }
};
