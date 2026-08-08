<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DATA:AUDIT_DATA's record, owned by this module — mirrors every
     * other module's own audit log migration exactly. Immutable: no
     * `updated_at`, no update/delete path anywhere in this module. Covers
     * this module's own index maintenance operations (an entry indexed,
     * removed, or the whole index rebuilt) — deliberately does NOT log
     * every individual search query, which would make this table grow
     * unbounded on read traffic with no compensating governance value;
     * `search.products.searched` style query logging is a Phase 2
     * analytics concern, not an audit concern, per this module's own
     * scope boundary (see docs/04_MODULE_ARCHITECTURE.md's v1.5 entry).
     */
    public function up(): void
    {
        Schema::create('search_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('actor_id')->nullable();
            $table->string('action');
            $table->string('target_type')->nullable();
            $table->string('target_id')->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('correlation_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['target_type', 'target_id']);
            $table->index('correlation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_audit_logs');
    }
};
