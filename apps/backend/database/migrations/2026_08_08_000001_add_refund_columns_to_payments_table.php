<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive extension of Payments' own aggregate for the Returns module
     * (`MODULE:RETURNS`) — per Gateways\Contracts\RefundableGateway's own
     * docblock, written when Payments was first built: "full refund
     * workflow... is Returns' concern... this interface is the seam that
     * future module extends, not a reimplementation of it now." This
     * migration is that extension arriving: `captured` was Payment's one
     * success terminal state with no further transitions (Models\Payment's
     * own TRANSITIONS map); `refunded`/`partially_refunded` are new exits
     * from it, added the same additive way Couriers\
     * ShippingProviderContract gained bookShipment() when Fulfillment
     * needed it — no existing column, status value, or caller changes
     * shape.
     *
     * `amount_refunded` mirrors `amount_captured`'s own shape exactly
     * (same precision, same default-zero, same "running total" semantics
     * — a payment may be refunded more than once, partially each time,
     * per this module's Bangladesh-first "Partial return" requirement).
     * `refunded_at` mirrors `captured_at` — set once, the first time this
     * payment reaches a refunded state, never overwritten by a later
     * partial refund on top of an already-partially-refunded payment.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('amount_refunded', 14, 4)->default(0)->after('amount_captured');
            $table->timestamp('refunded_at')->nullable()->after('failed_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['amount_refunded', 'refunded_at']);
        });
    }
};
