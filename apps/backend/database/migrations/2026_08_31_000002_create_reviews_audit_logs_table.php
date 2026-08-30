<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DATA:AUDIT_DATA's record for Reviews — mirrors every other module's
     * own identically-shaped audit log table exactly (see Returns' own
     * `returns_audit_logs` migration for the full rationale).
     */
    public function up(): void
    {
        Schema::create('reviews_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('actor_id')->nullable();
            $table->string('action');
            $table->string('target_type')->nullable();
            $table->uuid('target_id')->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('correlation_id')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['tenant_id', 'action']);
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews_audit_logs');
    }
};
