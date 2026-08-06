<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\CompleteRefundRequestAction once Payments has
 * confirmed the refund genuinely succeeded (via its own PaymentRefunded
 * event, relayed by app/Listeners/CompleteRefundOnPaymentRefunded.php) —
 * named explicitly in the master plan's Returns entry. This is Returns'
 * own fact ("this return's refund is done"), distinct from Payments'
 * PaymentRefunded ("this payment was refunded") — the same event-per-
 * owning-module discipline every other cross-module flow in this
 * platform already follows.
 */
final class RefundIssued extends DomainEvent
{
    public function __construct(
        public readonly string $returnRequestId,
        public readonly string $refundRequestId,
        public readonly string $paymentId,
        public readonly string $amount,
        public readonly string $currencyCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'returns.refund_request.issued';
    }
}
