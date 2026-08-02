<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * An Option defines one variant dimension (e.g. "Color", "Size") that
     * a configurable Product's variants are built from — see the
     * attributes migration's docblock for why this is a separate concept
     * from Attribute. Option is the aggregate root for its OptionValues
     * below (DATA:AGGREGATE_BOUNDARIES): a value never exists, changes,
     * or is removed except through its owning Option.
     */
    public function up(): void
    {
        Schema::create('options', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('code');
            $table->string('name');
            $table->unsignedInteger('position')->default(0);
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('options');
    }
};
