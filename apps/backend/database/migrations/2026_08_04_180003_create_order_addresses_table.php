<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Billing address snapshot" and "Shipping address snapshot" — one
     * row per `address_type` (billing/shipping), copied at order-creation
     * time from either a CustomerAddress the customer already has on file
     * or an inline address the caller supplies for a one-off delivery,
     * per Actions\CreateOrderAction's resolution logic. Either way, only
     * the field VALUES are copied — never a reference back to the source
     * CustomerAddress row — so a later edit or deletion of that address
     * never changes what this historical order says it shipped to.
     *
     * Same field shape as Customers' CustomerAddress, deliberately, for a
     * predictable snapshot; no `lock_version`, for the same "written once,
     * never updated" reasoning as order_items.
     */
    public function up(): void
    {
        Schema::create('order_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('address_type');
            $table->string('recipient_name');
            $table->string('phone')->nullable();
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('city');
            $table->string('region')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('country_code');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->unique(['order_id', 'address_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_addresses');
    }
};
