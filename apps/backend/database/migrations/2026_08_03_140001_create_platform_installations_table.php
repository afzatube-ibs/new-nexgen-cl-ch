<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:INSTALLER's one, minimal piece of owned data — per its
     * planning/IMPLEMENTATION_MASTER_PLAN.md entry, "Data Ownership: None
     * persistent beyond triggering Identity & Access / Store Configuration
     * writes." This table is not business data; it is this module's own
     * completion marker and lock, doubling as the record of "an install
     * happened, when, and by whom" — DATA:AUDIT_DATA's minimal audit
     * requirement for a module whose only action ever happens once.
     *
     * `slot` is always 1 and carries a unique constraint so this table can
     * never hold more than one row — the database itself enforces
     * "installation happens at most once," which is this module's Security
     * Considerations requirement ("the installer itself must be disabled or
     * locked after first run").
     *
     * No `lock_version` (nothing here is ever updated) and no soft deletes
     * (an installation record is a permanent historical fact, never
     * archived or removed) — this row's entire lifecycle is a single
     * insert.
     */
    public function up(): void
    {
        Schema::create('platform_installations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedTinyInteger('slot')->default(1);
            $table->uuid('installed_by');
            $table->timestamp('created_at')->useCurrent();

            $table->unique('slot');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_installations');
    }
};
