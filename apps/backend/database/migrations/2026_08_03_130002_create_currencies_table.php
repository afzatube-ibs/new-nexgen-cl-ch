<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Currency is MODULE:LOCALIZATION's aggregate root for the platform's
     * supported-currency registry and exchange-rate source, per planning/
     * IMPLEMENTATION_MASTER_PLAN.md's Localization & Currency entry
     * ("Currency configuration"; "any rate source must be auditable").
     * Distinct from Store Configuration's `stores.currency_code` column,
     * which is the store's own chosen operating currency — this table is
     * the authoritative registry other modules (Pricing, Orders, once
     * built) will read for real exchange-rate conversion.
     *
     * `exchange_rate` is always relative to whichever Currency has
     * `is_base` true — the single-base invariant enforced in
     * Actions\UpdateCurrencyAction, which also forces exchange_rate to
     * exactly 1.000000 whenever a currency becomes base. decimal(20,6)
     * comfortably covers every real-world exchange rate's precision
     * without floating-point rounding risk.
     */
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->char('code', 3);
            $table->string('name');
            $table->string('symbol');
            $table->unsignedTinyInteger('decimal_places')->default(2);
            $table->decimal('exchange_rate', 20, 6)->default(1);
            $table->boolean('is_base')->default(false);
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
        Schema::dropIfExists('currencies');
    }
};
