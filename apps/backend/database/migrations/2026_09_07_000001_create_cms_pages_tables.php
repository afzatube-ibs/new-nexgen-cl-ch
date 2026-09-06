<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default')->index();
            $table->uuid('store_id');
            $table->string('slug', 160);
            $table->string('title', 180);
            $table->string('locale', 16)->default('en');
            $table->json('content');
            $table->string('meta_title', 180)->nullable();
            $table->text('meta_description')->nullable();
            $table->string('status', 24)->default('draft');
            $table->json('published_snapshot')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->uuid('published_by')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->unique(['store_id', 'locale', 'slug'], 'cms_pages_store_locale_slug_unique');
            $table->index(['store_id', 'status']);
            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('published_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('cms_page_revisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('page_id');
            $table->json('snapshot');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['page_id', 'created_at']);
            $table->foreign('page_id')->references('id')->on('cms_pages')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_page_revisions');
        Schema::dropIfExists('cms_pages');
    }
};
