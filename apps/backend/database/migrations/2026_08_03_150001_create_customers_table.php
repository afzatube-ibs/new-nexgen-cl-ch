<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Customer is MODULE:CUSTOMERS' aggregate root — customer-facing
     * account and profile data, distinct from Identity & Access's staff
     * User (see App\Domains\Platform\IdentityAccess\Models\User's own
     * docblock: "never a customer account"). This is a genuinely separate
     * credential store — `password` is this module's own, not a reference
     * into Identity & Access's `users` table — per planning/
     * IMPLEMENTATION_MASTER_PLAN.md's Customers entry ("distinct from
     * Identity & Access's staff/user concept").
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE's
     * Active/Archived/Deleted framework. `lock_version` implements
     * DATA:VERSIONING for the whole aggregate — see the customer_addresses
     * migration's docblock for why address mutations also version this
     * table. `tenant_id` implements ARCH:DATA_OWNERSHIP's designed-in,
     * unexercised tenant boundary. Customer profile and address data is
     * Sensitive per DATA:CLASSIFICATION, per this module's own Security
     * Considerations entry in the master plan.
     */
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->string('email');
            $table->string('password');
            $table->string('phone')->nullable();
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'email']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
