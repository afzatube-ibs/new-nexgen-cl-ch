<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Localization & Currency's own audit trail — a separate table from
     * every other module's, per DATA:AUDIT_DATA's "audit data is owned by
     * the same module that owns the data it describes." Structurally
     * identical to Store Configuration's audit log (actor, action, target
     * identity, timestamp, before/after, correlation) per DATA:AUDIT_DATA's
     * "every module's audit records follow the same structural
     * expectation," and, like that one, immutable — no `updated_at`, no
     * update/delete code path exists anywhere in this module. Currency
     * rate changes in particular must be auditable per this module's
     * Security Considerations entry in planning/IMPLEMENTATION_MASTER_
     * PLAN.md ("any rate source must be auditable").
     */
    public function up(): void
    {
        Schema::create('localization_audit_logs', function (Blueprint $table) {
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
        Schema::dropIfExists('localization_audit_logs');
    }
};
