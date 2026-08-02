<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Brand is one of MODULE:CATALOG's owned taxonomies — see
     * planning/IMPLEMENTATION_MASTER_PLAN.md's Catalog entry ("owns
     * product, category, brand, attribute, and variant information").
     * `logo_media_id` is a plain identifier reference into MODULE:MEDIA's
     * `media_assets` table — deliberately not a database foreign key,
     * since a schema-level FK across module boundaries would be exactly
     * the tight coupling DATA:CROSS_MODULE_ACCESS forbids; existence is
     * instead checked at the application/validation layer (see
     * Http\Requests\CreateBrandRequest). Resolving the identifier into a
     * usable URL happens through MediaAsset::url(), never by Catalog
     * touching storage directly.
     */
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->uuid('logo_media_id')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();
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
        Schema::dropIfExists('brands');
    }
};
