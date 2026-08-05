<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The child ledger of every gateway interaction against a Payment —
     * merges what the master plan names separately as "Payment
     * Transactions" and "Payment Attempts" into one append-only table,
     * since in practice a single gateway interaction round (one HTTP call
     * out, one recorded outcome) is both at once: it IS the attempt, and
     * it IS the transaction record of what that attempt did. Splitting
     * them into two parallel tables would duplicate the same row shape
     * for no behavioural gain — see Models\PaymentAttempt's docblock for
     * the type/status vocabulary.
     *
     * Write-once, like Orders' OrderTimelineEvent and Checkout's audit
     * log: no `lock_version`, no update path anywhere in this module — a
     * new gateway interaction always produces a NEW row, never mutates an
     * existing one, so this table is itself an accurate, tamper-evident
     * history of everything ever attempted against a Payment.
     *
     * `gateway_reference` is the gateway's own transaction/payment
     * identifier (bKash's paymentID, SSLCommerz's tran_id — this
     * Payment's own id, per Gateways\SslcommerzGateway's docblock —
     * Nagad's paymentReferenceId, or null for Cash On Delivery and Bank
     * Transfer, which have no external gateway reference).
     *
     * The unique index is scoped to `(payment_id, type, gateway_reference)`,
     * not `(gateway_code, gateway_reference)` alone: a single Payment's
     * `initiation` and `capture` attempts legitimately share the exact
     * same gateway_reference for a gateway like SSLCommerz, whose
     * `tran_id` is this platform's own chosen identifier and therefore
     * identical across every callback for that one payment — scoping by
     * `type` as well lets those coexist while still refusing a second row
     * of the *same* type carrying the *same* reference, which is this
     * table's own "Duplicate Callback Protection" backstop beneath
     * Actions\ProcessGatewayWebhookAction's primary, cross-payment
     * payment_webhook_events-keyed replay check (MySQL already treats
     * multiple NULLs in a unique index as distinct, which is exactly the
     * semantics wanted for Cash On Delivery/Bank Transfer's null
     * gateway_reference).
     *
     * `request_payload`/`response_payload` are sanitized JSON snapshots
     * of what was sent/received — sanitized meaning "whatever the gateway
     * itself returns," which for every gateway this module integrates
     * with in Phase 1 never includes raw card data in the first place
     * (Bangladesh's first-class methods are redirect/token/cash-based, not
     * card-collecting), consistent with this module's "never stores card
     * data" Responsibility.
     */
    public function up(): void
    {
        Schema::create('payment_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->string('type');
            $table->string('status');
            $table->string('gateway_code');
            $table->string('gateway_reference')->nullable();
            $table->decimal('amount', 14, 4)->nullable();
            $table->char('currency_code', 3)->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('created_at');

            $table->unique(['payment_id', 'type', 'gateway_reference']);
            $table->index(['gateway_code', 'gateway_reference']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_attempts');
    }
};
