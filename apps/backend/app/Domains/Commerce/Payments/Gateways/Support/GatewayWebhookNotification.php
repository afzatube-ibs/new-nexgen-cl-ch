<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways\Support;

/**
 * The normalized shape every Gateways\Contracts\PaymentGatewayContract::
 * parseWebhookPayload() call produces, regardless of how differently each
 * gateway shapes its own raw callback — this is what lets Actions\
 * ProcessGatewayWebhookAction stay entirely gateway-agnostic. `status` is
 * one of `authorized`, `captured`, `failed`, or `cancelled`, mapped onto
 * Models\Payment's own shared status vocabulary by each gateway's own
 * parser, never left as that gateway's raw status string.
 */
final readonly class GatewayWebhookNotification
{
    public function __construct(
        public string $eventReference,
        public ?string $gatewayReference,
        public string $status,
        public ?string $amount,
        public ?string $currencyCode,
        public ?string $failureReason,
        /** @var array<string, mixed> */
        public array $raw,
    ) {}
}
