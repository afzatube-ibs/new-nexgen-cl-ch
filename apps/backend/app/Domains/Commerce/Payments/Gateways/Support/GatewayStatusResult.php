<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways\Support;

/**
 * What a Gateways\Contracts\PaymentGatewayContract::queryStatus() call
 * returns — used by Actions\ReconcilePaymentsAction (payments:reconcile)
 * to detect a Payment this module's own webhook processing missed,
 * exactly the "Reconciliation" capability the master plan names. Shares
 * the same gateway-agnostic `status` vocabulary as GatewayWebhookNotification.
 */
final readonly class GatewayStatusResult
{
    public function __construct(
        public string $status,
        public ?string $gatewayReference,
        public ?string $amount,
        /** @var array<string, mixed> */
        public array $raw,
    ) {}
}
