<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:PAYMENTS' aggregate root — one row per payment attempt-cycle
     * against an Order. Payments MUST NOT calculate prices, taxes, or
     * discounts (see Actions\InitiatePaymentAction's docblock): `amount`
     * is a one-time snapshot of Orders' own `grand_total`, read once at
     * initiation, exactly as `currency_code` snapshots Orders' own
     * `currency_code` — Payments never recalculates either afterward.
     *
     * `order_id` references Orders' Order by identifier only, never a
     * foreign key, per ARCH:CROSS_DOMAIN_COMMUNICATION — mirroring every
     * other module's SKU/customer-id-keying precedent. Unlike Order-to-
     * Customer snapshotting, Payments does not freeze order line items or
     * addresses; it only needs the amount owed and the currency it is
     * owed in.
     *
     * An Order may have MANY Payment rows over its lifetime (a failed
     * bKash attempt followed by a successful Cash On Delivery selection
     * is two rows, not one retried row) but never more than one
     * concurrently ACTIVE (pending/authorized) Payment — enforced by
     * Actions\InitiatePaymentAction locking on `order_id` before creating
     * a new row, not by a database constraint (MySQL cannot portably
     * express "unique among a status subset" without a generated-column
     * trick this project has no other precedent for).
     *
     * `customer_id` is a snapshot read once from the Order at initiation
     * time, purely so this table can be queried/reported on ("payments
     * for customer X") without a cross-module join — an identifier only,
     * never a duplicated business record, exactly like Orders' own
     * `customer_id` column.
     *
     * "Payment status lifecycle" — a one-directional graph with three
     * early exits, deliberately gateway-agnostic (no gateway-specific
     * status branches anywhere outside this column's own values):
     *
     *   pending -> authorized -> captured
     *      \            \
     *       ------------> failed / cancelled / voided
     *
     * `captured` is this aggregate's one success terminal state. Cash On
     * Delivery's own "Confirmed" vocabulary (see the master plan's
     * Payments entry) maps onto `captured` — cash collected at delivery
     * IS this aggregate's capture event, just triggered by an operator
     * action instead of a gateway callback; Gateways\CodGateway never
     * invents a parallel status a caller elsewhere in this module would
     * need to special-case.
     *
     * `idempotency_key` is this module's client-supplied duplicate-
     * submission guard for the *initiate* operation specifically (DATA:
     * VERSIONING's sibling concern, not a replacement for it) — a second
     * "start payment" request carrying a key already used returns the
     * existing Payment rather than creating a second one, exactly as
     * Checkout's own submission idempotency works.
     *
     * `proof_reference` is Bank Transfer's "Proof Upload Extension Point"
     * — a nullable, by-identifier-only reference to wherever the actual
     * uploaded file lives (a future Media module attachment id), never a
     * duplicated file-storage concern this module reimplements.
     *
     * `redirect_url`/`instructions` are the gateway-agnostic, ALREADY-
     * NORMALIZED (Gateways\Support\GatewayInitiationResult) surface a
     * caller acts on immediately after initiating a payment — a hosted-
     * checkout gateway's redirect target, or Cash On Delivery's/Bank
     * Transfer's plain-text confirmation/payment instructions. Neither
     * column ever holds a gateway's raw, differently-shaped response body
     * (that stays in payment_attempts' own `response_payload`) — Http\
     * Resources\PaymentResource can expose these two fields without ever
     * needing to know which gateway produced them.
     *
     * `lock_version` implements DATA:VERSIONING for the whole aggregate,
     * including every child PaymentAttempt row created alongside a status
     * change.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('order_id');
            $table->uuid('customer_id')->nullable();
            $table->string('gateway_code');
            $table->char('currency_code', 3);
            $table->decimal('amount', 14, 4);
            $table->decimal('amount_captured', 14, 4)->default(0);
            $table->string('status')->default('pending');
            $table->string('idempotency_key')->nullable();
            $table->string('proof_reference')->nullable();
            $table->string('redirect_url')->nullable();
            $table->text('instructions')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('initiated_at');
            $table->timestamp('authorized_at')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->unique('idempotency_key');
            $table->index(['tenant_id', 'status']);
            $table->index(['order_id', 'status']);
            $table->index('customer_id');
            $table->index('gateway_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
