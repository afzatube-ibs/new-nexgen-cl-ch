<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Product's images — each row a `position`/`is_primary` pairing of
     * a Product with a MODULE:MEDIA asset, referenced by `media_id` (a
     * plain identifier, not a database foreign key, for the same
     * cross-module-coupling reason the brands migration's `logo_media_id`
     * documents). Part of Product's aggregate (no lock_version of its
     * own; changes go through Product). Display fields (URL, alt text)
     * live on the MediaAsset itself, never duplicated here.
     */
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->uuid('media_id');
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index('product_id');
            $table->unique(['product_id', 'media_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
