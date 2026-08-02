<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_collections', function (Blueprint $table) {
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('collection_id')->constrained('collections')->restrictOnDelete();
            $table->unsignedInteger('position')->default(0);

            $table->primary(['product_id', 'collection_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_collections');
    }
};
