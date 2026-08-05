<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\AuthorizePaymentAction — the gateway has reserved
 * funds but not yet captured them. Not every gateway this module
 * integrates with produces this event: single-shot gateways (Cash On
 * Delivery, Bank Transfer, and most BD redirect-checkout flows) move
 * straight from pending to captured, per Models\Payment's status-lifecycle
 * docblock.
 */
final class PaymentAuthorized extends DomainEvent
{
    public function __construct(
        public readonly string $paymentId,
        public readonly string $orderId,
        public readonly string $gatewayCode,
        public readonly string $amount,
        public readonly string $currencyCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'payments.payment.authorized';
    }
}
