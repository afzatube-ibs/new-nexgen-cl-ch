<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DATA:AUDIT_DATA's record, owned by this module — see Pricing's
     * identically-shaped `pricing_audit_logs` migration for the full
     * rationale (every module owns its own audit trail, separate table,
     * immutable). "Coupon abuse (redemption limit bypass) requires the
     * same rigor as any financial control" per this module's Security
     * Considerations entry — every mutation here is audited.
     */
    public function up(): void
    {
        Schema::create('promotions_audit_logs', function (Blueprint $table) {
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
        Schema::dropIfExists('promotions_audit_logs');
    }
};
