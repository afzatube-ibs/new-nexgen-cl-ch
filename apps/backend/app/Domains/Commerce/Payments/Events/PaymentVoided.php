<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\VoidPaymentAction — an authorization released
 * before capture, distinct from PaymentCancelled (a customer/operator
 * decision) and PaymentFailed (the gateway rejected the attempt outright).
 */
final class PaymentVoided extends DomainEvent
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
        return 'payments.payment.voided';
    }
}
