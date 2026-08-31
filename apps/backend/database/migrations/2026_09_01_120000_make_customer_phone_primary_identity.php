<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — see
     * planning/architecture/PHASE_4_0_BANGLADESH_COMMERCE_ARCHITECTURE.md
     * Part 2 for the full design. `email` becomes optional (was
     * required); `phone` becomes the platform's real primary identifier
     * going forward, enforced as required+unique at the application/
     * validation layer for NEW registrations only (see
     * Http\Requests\RegisterCustomerRequest) — deliberately no
     * database-level NOT NULL on `phone` here, since real pre-existing
     * rows may already have a null phone and must keep working via email
     * login (the architecture document's own Part 4, Question 1
     * resolution: least disruptive, no forced backfill of data that
     * doesn't exist). A plain composite unique index on `(tenant_id,
     * phone)` is sufficient — standard SQL unique-index semantics treat
     * every NULL as distinct from every other NULL, so any number of
     * phone-less rows can coexist while a real, non-null phone value
     * stays genuinely unique.
     *
     * `phone_verification_status`/`phone_verified_at` implement the
     * Product Owner's own addendum: a three-state verification concept
     * (unverified/verified/blocked) so a returning, already-verified
     * customer isn't asked for an OTP on every order — populated once
     * Slice 4.2's OTP module can actually verify a phone number; every
     * existing and newly-registered row starts `unverified` until then.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('phone_verification_status')->default('unverified')->after('phone');
            $table->timestamp('phone_verified_at')->nullable()->after('phone_verification_status');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->unique(['tenant_id', 'phone']);
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'phone']);
            $table->dropColumn(['phone_verification_status', 'phone_verified_at']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
        });
    }
};
