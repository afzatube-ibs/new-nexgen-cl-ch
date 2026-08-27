<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * neXgen Overnight Sprint — Milestone 1, Objective 1. `shipping_
     * option_id` now stores a real Operations\Shipping ShippingMethod id
     * (resolved via the real Shipping module, composed by the Gateway —
     * see Actions\SelectShippingOptionAction's own docblock, and
     * ARCH:DOMAIN_MAP for why Checkout cannot read Shipping's own
     * ShippingMethod.name in-process to display one itself). This column
     * is a plain snapshot of that method's real name at selection time,
     * mirroring how Orders freezes a Customer snapshot and Payments
     * freezes an Order's grand_total — never a live cross-domain read.
     */
    public function up(): void
    {
        Schema::table('checkout_sessions', function (Blueprint $table) {
            $table->string('shipping_option_label')->nullable()->after('shipping_option_id');
        });
    }

    public function down(): void
    {
        Schema::table('checkout_sessions', function (Blueprint $table) {
            $table->dropColumn('shipping_option_label');
        });
    }
};
