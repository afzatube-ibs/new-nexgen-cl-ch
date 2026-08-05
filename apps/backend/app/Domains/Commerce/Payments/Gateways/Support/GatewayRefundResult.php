<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Gateways\Support;

/**
 * What a Gateways\Contracts\RefundableGateway::refund() call returns —
 * this module's "Refund Extension Point" (see that interface's docblock).
 */
final readonly class GatewayRefundResult
{
    public function __construct(
        public string $status,
        public ?string $refundReference,
        /** @var array<string, mixed> */
        public array $raw,
    ) {}
}
