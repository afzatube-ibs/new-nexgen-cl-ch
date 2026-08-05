<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DATA:AUDIT_DATA's record, owned by this module — see Orders' and
     * Checkout's identically-shaped `orders_audit_logs`/
     * `checkout_audit_logs` migrations for the full rationale. Payment
     * data is Sensitive per this module's Data Ownership entry in the
     * master plan, so, per SECURITY:AUDIT_LOGGING's explicit floor for
     * Sensitive data, every mutation AND every access-relevant event
     * (webhook signature failures, duplicate-submission rejections) is
     * audited here — not mutations alone.
     */
    public function up(): void
    {
        Schema::create('payments_audit_logs', function (Blueprint $table) {
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
        Schema::dropIfExists('payments_audit_logs');
    }
};
