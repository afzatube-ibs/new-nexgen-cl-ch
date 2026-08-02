<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Store is MODULE:STORE_CONFIGURATION's aggregate root — the
     * business/store profile (identity, currency, locale, timezone,
     * contact, and registered address) every other module reads to know
     * "what store is this and how does it operate," per
     * planning/IMPLEMENTATION_MASTER_PLAN.md's Organizations & Stores
     * entry. Phase 1 exercises this as a single-store record; the schema
     * already carries `tenant_id` per ARCH:DATA_OWNERSHIP's designed-in
     * tenant boundary, so multi-store/multi-tenant (Phase 3) narrows an
     * already-present dimension instead of retrofitting one.
     *
     * `currency_code` and `country_code` are stored as their ISO
     * shape (format-validated at the API boundary — see
     * Http\Requests\CreateStoreRequest) but not cross-checked against a
     * live registry here: full currency/locale semantics are the future
     * Localization & Currency module's ownership (implementation order
     * item 5), not this one's, per DATA:CROSS_MODULE_ACCESS keeping each
     * module's scope to what it actually owns.
     */
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->char('currency_code', 3);
            $table->string('locale');
            $table->string('timezone');
            $table->string('contact_email');
            $table->string('contact_phone')->nullable();
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('city');
            $table->string('region')->nullable();
            $table->string('postal_code')->nullable();
            $table->char('country_code', 2);
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
        Schema::dropIfExists('stores');
    }
};
