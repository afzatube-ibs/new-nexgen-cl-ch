<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * An Attribute is a typed, informational fact a Product may carry
     * (e.g. "Material: Cotton") — deliberately distinct from Option/
     * OptionValue below, which exist specifically to define *variant*
     * dimensions (e.g. Color, Size). `type` governs how
     * product_attribute_values.value is interpreted at the application
     * layer; this table stays technology-neutral (a plain string) per
     * DATA:SCOPE, the interpretation is Attribute::type's job, not the
     * schema's. `is_filterable` is a simple flag future Search/Storefront
     * modules can read without Catalog depending on either.
     */
    public function up(): void
    {
        Schema::create('attributes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('attribute_group_id')->nullable()->constrained('attribute_groups')->nullOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('type');
            $table->boolean('is_filterable')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index('attribute_group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attributes');
    }
};
