<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Collection is a flat, curated grouping of products (e.g. "Summer
     * Sale", "New Arrivals") — deliberately distinct from Category's
     * hierarchical taxonomy. Phase 1 membership is manual (see
     * product_collections below); rule-based/dynamic membership is a
     * future extension this schema does not preclude.
     */
    public function up(): void
    {
        Schema::create('collections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collections');
    }
};
