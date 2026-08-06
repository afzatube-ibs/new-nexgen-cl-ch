<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\ResolveReturnRequestAction once inspection
 * concludes and a resolution (refund/exchange/reject) is decided. When
 * `resolution` is `refund`, this is the fact app/Listeners/
 * ProcessRefundOnReturnResolved.php reacts to, triggering Payments'
 * Actions\RefundPaymentAction — the cross-domain (Operations -> Commerce)
 * half of this module's refund coordination, per ARCH:
 * CROSS_DOMAIN_COMMUNICATION. Not named in planning/IMPLEMENTATION_
 * MASTER_PLAN.md's own three-event list (ReturnRequested, ReturnApproved,
 * RefundIssued) — this event is the deliberate seam between "a resolution
 * was decided" and Events\RefundIssued's "the money has actually moved,"
 * which the master plan's own acceptance criterion ("a refund never
 * occurs without an associated Payments module transaction reference")
 * requires to be two genuinely different moments, not one.
 */
final class ReturnResolved extends DomainEvent
{
    public function __construct(
        public readonly string $returnRequestId,
        public readonly string $orderId,
        public readonly string $resolution,
        public readonly ?string $refundRequestId,
        public readonly ?string $paymentId,
        public readonly ?string $amount,
        public readonly ?string $currencyCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'returns.return_request.resolved';
    }
}
