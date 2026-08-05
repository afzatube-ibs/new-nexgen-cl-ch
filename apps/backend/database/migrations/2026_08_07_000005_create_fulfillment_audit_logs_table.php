<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DATA:AUDIT_DATA's record, owned by this module — a dedicated table,
     * mirrors every other module's own audit log migration exactly (see
     * Pricing's or Shipping's for the full rationale). Immutable: no
     * `updated_at`, no update/delete path anywhere in this module.
     */
    public function up(): void
    {
        Schema::create('fulfillment_audit_logs', function (Blueprint $table) {
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
        Schema::dropIfExists('fulfillment_audit_logs');
    }
};
