<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:CATALOG's own audit trail, covering every aggregate this
     * module owns (Product, Variant, Category, Brand, Attribute, Option,
     * Collection, Tag) — per DATA:AUDIT_DATA, "audit data is owned by the
     * same module that owns the data it describes," never a shared table
     * with Identity & Access's or Store Configuration's own audit logs.
     * Immutable by design: no `updated_at`, no update/delete path exists
     * anywhere in this module.
     */
    public function up(): void
    {
        Schema::create('catalog_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('actor_id')->nullable();
            $table->string('action');
            $table->string('target_type')->nullable();
            $table->string('target_id')->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->uuid('correlation_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('actor_id');
            $table->index(['target_type', 'target_id']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_audit_logs');
    }
};
