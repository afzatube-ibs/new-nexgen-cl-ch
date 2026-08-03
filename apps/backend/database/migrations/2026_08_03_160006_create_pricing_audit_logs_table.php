<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pricing's own audit trail — a separate table from every other
     * module's, per DATA:AUDIT_DATA's "audit data is owned by the same
     * module that owns the data it describes." Structurally identical to
     * every other module's audit log (actor, action, target identity,
     * timestamp, before/after, correlation) per DATA:AUDIT_DATA's "every
     * module's audit records follow the same structural expectation," and,
     * like every other one, immutable — no `updated_at`, no update/delete
     * code path exists anywhere in this module. Every mutation is audited
     * per this module's own Security Considerations entry in the master
     * plan ("Price/tax tampering is a direct financial risk — every
     * mutation audited"). Reads are not audited here — pricing/tax data is
     * Confidential, not Sensitive, per DATA:CLASSIFICATION, so this
     * module follows Store Configuration's mutation-only precedent rather
     * than Identity & Access's/Customers' read-and-write precedent for
     * their Sensitive data.
     */
    public function up(): void
    {
        Schema::create('pricing_audit_logs', function (Blueprint $table) {
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
        Schema::dropIfExists('pricing_audit_logs');
    }
};
