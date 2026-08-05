<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\CancelPaymentAction — a pre-capture cancellation
 * (customer abandoned the gateway redirect, or an operator cancelled a
 * Cash On Delivery order before delivery), distinct from PaymentFailed
 * (the gateway itself reported the attempt did not succeed).
 */
final class PaymentCancelled extends DomainEvent
{
    public function __construct(
        public readonly string $paymentId,
        public readonly string $orderId,
        public readonly string $gatewayCode,
        public readonly string $reason,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'payments.payment.cancelled';
    }
}
