<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Identity & Access's `users` table — MODULE:IDENTITY_ACCESS's staff/
     * operator accounts (never customer accounts; those belong to the
     * future, distinct Customers module per 04_MODULE_ARCHITECTURE).
     *
     * `id` is a UUID, not an auto-increment integer, per DATA:ENTITY_IDENTITY
     * ("identity is immutable... and must never encode business meaning")
     * and specifically to resist account enumeration on what SECURITY
     * standard calls "the platform's highest-severity attack surface."
     *
     * `tenant_id` is ARCH:DATA_OWNERSHIP's tenant boundary designed in from
     * Phase 1, unexercised until real multi-tenancy is built — every row
     * defaults to Platform Foundation's single-installation TenantId
     * constant.
     *
     * `lock_version` implements DATA:VERSIONING's mandatory optimistic
     * concurrency: a write is rejected, not silently accepted, if the
     * aggregate changed since it was last read by whoever is writing.
     *
     * No `email_verified_at` — email verification isn't implemented in this
     * module and an unused column is exactly the undocumented-behavior
     * cruft ENGINEERING:TECHNICAL_DEBT_MANAGEMENT warns against; it can be
     * added, with the feature that needs it, later. No `password_reset_
     * tokens` or `sessions` (database-session-driver) tables either — this
     * platform never uses the database session driver (SESSION_DRIVER is
     * always Redis, per ADR-0004/ARCH:NFR statelessness) and password reset
     * requires the Notifications module (Phase 1, not yet built) to deliver
     * a reset link, so building the token table now would be dead schema
     * for a feature this module doesn't yet implement.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
