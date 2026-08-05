<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways;

use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayStatusResult;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayWebhookNotification;
use RuntimeException;

/**
 * Cash On Delivery — a first-class Bangladesh gateway, not a fallback
 * (per the master plan's explicit "Do NOT treat COD as a fallback"
 * instruction). Genuinely functional: no external network call exists to
 * make, since cash changes hands in person at delivery, not through any
 * processor this platform integrates with.
 *
 * "COD Payment Lifecycle" — Pending (order placed, awaiting delivery),
 * Confirmed (cash collected — this is Models\Payment's shared `captured`
 * status, per that model's docblock), Cancelled, Failed (delivery
 * attempted and refused/undeliverable) — all four already exist as this
 * module's own gateway-agnostic Payment statuses; this gateway invents no
 * status vocabulary of its own. An operator/courier confirms collection
 * through Actions\CapturePaymentAction via Http\Controllers\
 * PaymentActionController, exactly like every other gateway's capture
 * path — the only COD-specific thing is that nothing calls out to an
 * external API to get there.
 *
 * Future Extension Points named in the master plan and left unbuilt here,
 * deliberately (each would change WHETHER/HOW MUCH this gateway is
 * offered or charges, not how it processes a payment already offered):
 * COD fee, COD by shipping zone, COD by store, COD by product, COD by
 * customer group, COD risk rules. `config('payments.cod.fee')` already
 * names the seam a fee rule would read from.
 */
final readonly class CodGateway implements PaymentGatewayContract
{
    public function code(): string
    {
        return 'cod';
    }

    public function label(): string
    {
        return 'Cash On Delivery';
    }

    public function isAvailable(): bool
    {
        return true;
    }

    public function initiate(GatewayInitiationRequest $request): GatewayInitiationResult
    {
        return new GatewayInitiationResult(
            status: 'pending',
            gatewayReference: null,
            redirectUrl: null,
            instructions: 'Pay in cash when your order is delivered.',
            raw: [],
        );
    }

    public function verifyWebhookSignature(string $rawPayload, array $headers): bool
    {
        // Cash On Delivery has no external gateway and therefore no
        // webhook channel at all — a call arriving here would be a
        // misconfigured route, never a legitimate delivery, so this
        // always refuses rather than accepting anything sight-unseen.
        return false;
    }

    public function parseWebhookPayload(string $rawPayload, array $headers): GatewayWebhookNotification
    {
        throw new RuntimeException('Cash On Delivery does not support webhook notifications.');
    }

    public function queryStatus(string $gatewayReference): GatewayStatusResult
    {
        throw new RuntimeException('Cash On Delivery has no external gateway to query — its status lives entirely in this module\'s own Payment record.');
    }
}
