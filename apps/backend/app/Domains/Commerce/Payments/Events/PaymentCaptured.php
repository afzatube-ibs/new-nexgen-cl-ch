<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\CapturePaymentAction — this module's one success
 * terminal event. Named in the master plan's Payments entry as the event
 * a future Orders-side (or Fulfillment-side) listener would subscribe to
 * in order to react to a completed payment (e.g. auto-confirming a
 * pending Order) — not built in this delivery, deliberately: deciding
 * when an Order should transition is Orders' own business logic, per this
 * module's "Payments MUST NOT ... duplicate any business logic" rule, so
 * Payments only publishes what happened and leaves the reaction to
 * whichever module owns that decision (ARCH:CROSS_DOMAIN_COMMUNICATION's
 * event boundary, exercised the same way every other module's published-
 * but-not-yet-subscribed-to event already is in this project).
 */
final class PaymentCaptured extends DomainEvent
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
        return 'payments.payment.captured';
    }
}
