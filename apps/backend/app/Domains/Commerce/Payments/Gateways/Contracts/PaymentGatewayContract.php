<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways\Contracts;

use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayStatusResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayWebhookNotification;

/**
 * The one seam every payment processor integrates through — "Adding a new
 * gateway should require ONLY: Implement PaymentGateway contract,
 * Register the gateway. No business logic changes," per the master plan's
 * Payments entry. Every method here is deliberately narrow and
 * gateway-agnostic: nothing in this interface, or in any Action that
 * consumes it, ever branches on which concrete gateway it is talking to.
 *
 * A future processor (Stripe, PayPal, Adyen, ...) becomes a new class
 * implementing this interface plus a Gateways\GatewayFactory case and a
 * config/payments.php entry — never a change to Models\Payment, any
 * Actions\* class, or any controller.
 */
interface PaymentGatewayContract
{
    /**
     * The stable identifier this gateway is registered and resolved
     * under — must match its config/payments.php key and Models\Payment::
     * $gateway_code values that select it.
     */
    public function code(): string;

    public function label(): string;

    /**
     * Whether this gateway is currently usable — false when required
     * configuration (credentials, merchant ids) is absent, per SECURITY:
     * SECRETS_MANAGEMENT. Gateways\GatewayResolver refuses to resolve an
     * unavailable gateway rather than letting a caller discover the gap
     * mid-transaction.
     */
    public function isAvailable(): bool;

    /**
     * Starts a payment. For a hosted-checkout gateway this makes the
     * real outbound call to that gateway's session/token API and returns
     * a redirect URL; for Cash On Delivery and Bank Transfer, which have
     * no external gateway to call, this returns an immediate result with
     * no network interaction at all.
     */
    public function initiate(GatewayInitiationRequest $request): GatewayInitiationResult;

    /**
     * Verifies that an inbound webhook delivery genuinely originated from
     * this gateway — SECURITY:SECURITY_BOUNDARIES' external-integration
     * boundary made concrete: "Never trust gateway callbacks. Always
     * verify signatures." Some gateways (bKash's tokenized checkout) have
     * no payload-signing scheme at all; those gateways implement this by
     * treating the ability to positively re-verify the transaction via
     * queryStatus() as the trust anchor instead — see Gateways\
     * BkashGateway's docblock — but every gateway MUST implement genuine
     * verification here, never an unconditional `true`.
     *
     * @param  array<string, mixed>  $headers
     */
    public function verifyWebhookSignature(string $rawPayload, array $headers): bool;

    /**
     * Normalizes this gateway's own callback/IPN payload shape into the
     * shared GatewayWebhookNotification DTO every gateway produces,
     * keeping Actions\ProcessGatewayWebhookAction entirely gateway-
     * agnostic. Called only after verifyWebhookSignature() has already
     * returned true.
     *
     * @param  array<string, mixed>  $headers
     */
    public function parseWebhookPayload(string $rawPayload, array $headers): GatewayWebhookNotification;

    /**
     * Queries this gateway directly for a transaction's current status —
     * this module's "Query Payment" / "Verification" capability, and the
     * mechanism Actions\ReconcilePaymentsAction (payments:reconcile) uses
     * to catch a Payment whose webhook delivery never arrived.
     */
    public function queryStatus(string $gatewayReference): GatewayStatusResult;
}
