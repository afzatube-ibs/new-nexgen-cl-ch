<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways\Support;

/**
 * What a Gateways\Contracts\PaymentGatewayContract::initiate() call
 * returns. `status` is one of `pending` (awaiting the customer/gateway —
 * the normal case for every gateway in this module), `captured`
 * (Cash On Delivery, which never has anything to wait for), or `failed`
 * (the gateway rejected the attempt immediately, e.g. bad credentials or
 * an invalid amount). `redirectUrl` is populated only for hosted-checkout
 * gateways (SSLCommerz, bKash); `instructions` only for gateways with no
 * redirect at all (Cash On Delivery's confirmation text, Bank Transfer's
 * account details).
 */
final readonly class GatewayInitiationResult
{
    public function __construct(
        public string $status,
        public ?string $gatewayReference,
        public ?string $redirectUrl,
        public ?string $instructions,
        /** @var array<string, mixed> */
        public array $raw,
    ) {}
}
