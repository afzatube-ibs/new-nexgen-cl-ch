<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SECURITY:SECURITY_BOUNDARIES' external-integration boundary made
     * concrete for every inbound gateway callback: "Webhook Replay
     * Protection" and "Duplicate Callback Protection" are both enforced
     * by this table's `(gateway_code, event_reference)` unique index, not
     * by application-level logic alone — a second delivery of a webhook
     * this platform has already recorded is rejected at the database
     * layer even under concurrent delivery, exactly the same discipline
     * DATA:VERSIONING applies to concurrent writes elsewhere.
     *
     * Deliberately NOT nested under `payments` (no `payment_id` foreign
     * key, only a nullable reference column) — a webhook can arrive
     * before this module can even identify which Payment it belongs to
     * (a malformed payload, an unrecognized gateway_reference, or a
     * signature that fails verification before parsing is attempted),
     * and Actions\ProcessGatewayWebhookAction's own "never trust a
     * gateway callback" discipline means recording that an unverified or
     * unmatched delivery happened is itself a security-relevant audit
     * fact (SECURITY:AUDIT_LOGGING) independent of whether it maps to a
     * real Payment.
     *
     * `event_reference` is the gateway's own idempotent delivery/event
     * identifier where the gateway supplies one, or a deterministic
     * sha256 of the raw payload where it does not — either way, replaying
     * the exact same delivery twice produces the exact same
     * `event_reference` and is therefore caught by the unique index.
     *
     * `signature_valid` and `status` are recorded even for rejected
     * deliveries: SECURITY:AUDIT_LOGGING's floor applies to "any access
     * to Confidential or Sensitive data" regardless of whether that
     * access was legitimate — an attempted forged webhook is exactly the
     * kind of signal SECURITY:MONITORING names as something the platform
     * must be able to recognize, not merely have logged after the fact.
     */
    public function up(): void
    {
        Schema::create('payment_webhook_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('gateway_code');
            $table->string('event_reference');
            $table->uuid('payment_id')->nullable();
            $table->boolean('signature_valid')->default(false);
            $table->string('status')->default('received');
            $table->json('payload')->nullable();
            $table->json('headers')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('created_at');

            $table->unique(['gateway_code', 'event_reference']);
            $table->index('payment_id');
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_webhook_events');
    }
};
