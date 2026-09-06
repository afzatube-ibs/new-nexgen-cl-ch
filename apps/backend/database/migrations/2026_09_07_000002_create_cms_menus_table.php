<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_menus', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default')->index();
            $table->uuid('store_id');
            $table->string('handle', 64);
            $table->string('title', 120);
            $table->json('items');
            $table->string('status', 24)->default('draft');
            $table->json('published_snapshot')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->uuid('published_by')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->unique(['store_id', 'handle'], 'cms_menus_store_handle_unique');
            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('published_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_menus');
    }
};
