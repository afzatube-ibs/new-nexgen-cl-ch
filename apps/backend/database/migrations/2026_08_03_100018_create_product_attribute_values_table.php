<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Product's actual value for a given Attribute (e.g. Product X,
     * Attribute "Material" = "Cotton"). Part of Product's aggregate — no
     * lock_version of its own; see product_images' docblock for the same
     * reasoning. Stored as a plain string regardless of Attribute::type
     * (number/boolean/date included) — interpretation is the application
     * layer's job, per DATA:SCOPE keeping this schema technology-neutral.
     */
    public function up(): void
    {
        Schema::create('product_attribute_values', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('attribute_id')->constrained('attributes')->restrictOnDelete();
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'attribute_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_attribute_values');
    }
};
