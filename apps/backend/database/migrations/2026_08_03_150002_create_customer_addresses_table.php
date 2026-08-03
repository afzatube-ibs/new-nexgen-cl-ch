<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A customer's address book — a child entity reached only through its
     * owning Customer, per DATA:AGGREGATE_BOUNDARIES: "nothing outside the
     * aggregate may modify a part of it directly; changes go through the
     * aggregate root." Customer and its addresses form one aggregate (the
     * single-default-shipping / single-default-billing invariants must be
     * consistent at every moment across all of one customer's addresses),
     * so this table deliberately carries no `lock_version` of its own —
     * DATA:VERSIONING is enforced at the aggregate root (`customers.
     * lock_version`), which every address-mutating action also increments,
     * per DATA:TRANSACTION_BOUNDARIES keeping the whole aggregate's
     * concurrency control in one place rather than fragmenting it across
     * child rows.
     *
     * `is_default_shipping` / `is_default_billing` are independent flags
     * (a customer may have different default shipping and billing
     * addresses) — the single-default-per-type invariant is enforced in
     * Actions\AddCustomerAddressAction / UpdateCustomerAddressAction, not
     * at the schema level, matching this module's Locale/Currency-style
     * precedent elsewhere in the platform.
     */
    public function up(): void
    {
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('customer_id');
            $table->string('label')->nullable();
            $table->string('recipient_name');
            $table->string('phone')->nullable();
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('city');
            $table->string('region')->nullable();
            $table->string('postal_code')->nullable();
            $table->char('country_code', 2);
            $table->boolean('is_default_shipping')->default(false);
            $table->boolean('is_default_billing')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('customer_id')->references('id')->on('customers')->cascadeOnDelete();
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
    }
};
