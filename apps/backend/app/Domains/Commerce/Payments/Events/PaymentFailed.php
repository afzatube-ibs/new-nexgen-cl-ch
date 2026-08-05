<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\MarkPaymentFailedAction. `$reason` never carries a
 * gateway's raw response verbatim — see that action's docblock — only a
 * short, human-readable summary, consistent with SECURITY:EVENT_SECURITY
 * ("an event must never leak ... data to a subscriber with no legitimate
 * need for it").
 */
final class PaymentFailed extends DomainEvent
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
        return 'payments.payment.failed';
    }
}
