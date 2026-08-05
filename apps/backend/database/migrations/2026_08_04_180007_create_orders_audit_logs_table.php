<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DATA:AUDIT_DATA's record, owned by this module — see Pricing's and
     * Promotions' identically-shaped `pricing_audit_logs`/
     * `promotions_audit_logs` migrations for the full rationale. Order
     * data is Confidential per this module's own Data Ownership entry in
     * the master plan, so — per Store Configuration's and Pricing's own
     * mutation-only precedent rather than Identity & Access's/Customers'
     * read-and-write precedent for Sensitive data — only mutations are
     * audited here, not reads.
     */
    public function up(): void
    {
        Schema::create('orders_audit_logs', function (Blueprint $table) {
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
        Schema::dropIfExists('orders_audit_logs');
    }
};
