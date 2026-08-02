<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A single value within an Option (e.g. "Red" within "Color"). Part of
     * Option's aggregate — no lock_version of its own, per DATA:AGGREGATE_
     * BOUNDARIES; concurrency control happens at the Option aggregate root
     * (see Models\Option). No soft delete either, for the same reason:
     * this row's lifecycle is entirely governed by its parent Option.
     */
    public function up(): void
    {
        Schema::create('option_values', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('option_id')->constrained('options')->cascadeOnDelete();
            $table->string('value');
            $table->string('slug');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['option_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('option_values');
    }
};
