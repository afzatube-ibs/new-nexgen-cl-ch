<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Product is MODULE:CATALOG's central aggregate root — "the platform's
     * core sellable-item data," per planning/IMPLEMENTATION_MASTER_PLAN.md.
     *
     * Deliberately excludes any price/cost column: base pricing is
     * MODULE:PRICING's exclusive ownership (implementation order item 9,
     * not yet built) — Catalog "owns product... information," never price,
     * per 04_MODULE_ARCHITECTURE's Commerce domain list ("Pricing... owns
     * base pricing rules. Depends on Catalog" — never the reverse).
     *
     * `status` (draft/active/archived) implements DATA:LIFECYCLE's
     * Active/Archived/Deleted framework at the business level (draft and
     * active both map to "Active" — an editable, alive record — archived
     * maps to "Archived"; soft deletes below implement "Deleted") and
     * carries this module's publishing workflow. `visibility` is a
     * separate, orthogonal concern (Magento's well-established four-state
     * model) — a product can be `active` but still `not_visible` (e.g.
     * available only via direct link or as a bundle component later).
     *
     * `metadata` is a deliberately loose JSON bag for the "Product
     * Metadata" requirement — free-form data that does not warrant a typed
     * Attribute (see attributes migration's docblock for that distinction).
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->string('sku');
            $table->string('barcode')->nullable();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('short_description')->nullable();
            $table->string('product_type')->default('simple');
            $table->string('status')->default('draft');
            $table->string('visibility')->default('catalog_search');
            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();
            $table->string('meta_keywords')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'sku']);
            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'status', 'visibility']);
            $table->index('brand_id');
            $table->index('barcode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
