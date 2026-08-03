<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Locale is MODULE:LOCALIZATION's aggregate root for the platform's
     * supported-language registry — the set of locales an operator has
     * activated for this installation, per planning/IMPLEMENTATION_MASTER_
     * PLAN.md's Localization & Currency entry ("Locale... configuration").
     * Distinct from Store Configuration's `stores.locale` column: that
     * column is the store's own chosen operating locale (a plain string it
     * owns), this table is the authoritative registry of which locale
     * codes are valid/available platform-wide.
     *
     * `is_default` implements the single-default invariant enforced in
     * Actions\UpdateLocaleAction (exactly one Locale may be default at a
     * time). `is_rtl` gives a future frontend what UI:INTERNATIONALIZATION
     * requires for right-to-left rendering, without this module rendering
     * anything itself.
     */
    public function up(): void
    {
        Schema::create('locales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('code');
            $table->string('name');
            $table->string('native_name');
            $table->boolean('is_rtl')->default(false);
            $table->boolean('is_default')->default(false);
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locales');
    }
};
