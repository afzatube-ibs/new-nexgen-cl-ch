<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\InitiatePaymentAction once a new Payment has been
 * created for an Order — before any gateway interaction has necessarily
 * completed, since a redirect-based gateway (SSLCommerz, bKash) is only
 * "initiated," not yet authorized or captured, at this point.
 */
final class PaymentInitiated extends DomainEvent
{
    public function __construct(
        public readonly string $paymentId,
        public readonly string $orderId,
        public readonly ?string $customerId,
        public readonly string $gatewayCode,
        public readonly string $amount,
        public readonly string $currencyCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'payments.payment.initiated';
    }
}
