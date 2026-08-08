<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:SEARCH's only owned data — a derived, read-optimized view
     * over Catalog's own Product data, per `DATA:SEARCH_INDEXING`
     * ("never a second source of truth... must always be possible to
     * rebuild a search index entirely from its owning module's data").
     * Every column here is either a plain copy of a Catalog-owned field
     * or something computed from Catalog-owned fields alone — nothing a
     * future `search:reindex` run (Console\Commands\ReindexCommand)
     * couldn't reconstruct from scratch.
     *
     * `product_id` is a plain, unique, non-foreign-key UUID column —
     * per `DATA:CROSS_MODULE_ACCESS`, even a same-domain reference
     * (Search and Catalog are both Commerce) never uses a
     * database-level foreign key, mirroring Orders' own narrow
     * same-domain dependency on Customers, which is real and exercised
     * in code but never a DB constraint.
     *
     * `searchable_text` is a denormalized concatenation (name, SKU,
     * short/long description, meta fields, brand name, category names)
     * that Actions\IndexProductAction builds — the one column the
     * FULLTEXT index below actually searches, so a query term matching
     * any of those fields is found without joining back to Catalog's
     * own tables at query time.
     *
     * The FULLTEXT index requires InnoDB (supported since MariaDB
     * 10.0.5 / MySQL 5.6, satisfying ADR-0003's "deployable without
     * specialized database administration expertise" — no separate
     * search engine to install or operate) and is added via raw SQL
     * since Laravel's schema builder has no first-class `fullText()`
     * helper for MySQL/MariaDB grammars at this version.
     */
    public function up(): void
    {
        Schema::create('product_search_index', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('product_id');
            $table->string('sku');
            $table->string('name');
            $table->text('searchable_text');
            $table->string('status');
            $table->string('visibility');
            $table->uuid('brand_id')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'product_id']);
            $table->index(['tenant_id', 'status', 'visibility']);
            $table->index('brand_id');
        });

        DB::statement('ALTER TABLE product_search_index ADD FULLTEXT search_fulltext_index (name, searchable_text)');
    }

    public function down(): void
    {
        Schema::dropIfExists('product_search_index');
    }
};
