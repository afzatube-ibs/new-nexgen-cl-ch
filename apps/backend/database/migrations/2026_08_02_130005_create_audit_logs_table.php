<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Identity & Access's audit trail — per DATA:AUDIT_DATA, "audit data is
     * owned by the same module that owns the data it describes," and per
     * SECURITY:AUDIT_LOGGING, authentication attempts, authorization
     * denials, permission/role changes, and any access to Confidential or
     * Sensitive data are always audited regardless of MODULE:STABILITY.
     *
     * Immutable by design: no `updated_at`, no update/delete path exists
     * anywhere in this module's code — an audit record, once written, is
     * never revised, matching DATA:RETENTION's "deletion is always an
     * explicit, intentional action" applied to the one category of data
     * that must never be editable at all.
     *
     * `actor_id` is nullable: a failed authentication attempt has no
     * authenticated actor, but must still be audited.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
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
        Schema::dropIfExists('audit_logs');
    }
};
