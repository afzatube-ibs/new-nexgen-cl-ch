<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\RefundPaymentAction once a refund has genuinely
 * succeeded against the gateway — this module's success terminal event
 * for the refund flow, mirroring PaymentCaptured's own role for the
 * capture flow. Added when the Returns module (`MODULE:RETURNS`) was
 * built — see Gateways\Contracts\RefundableGateway's own docblock, which
 * named this exact extension in advance ("this interface is the seam
 * that future module extends").
 *
 * Returns' own app/Listeners/CompleteRefundOnPaymentRefunded.php
 * subscribes to this event to mark its own RefundRequest completed and
 * publish RefundIssued — Payments never depends on Returns, or knows it
 * exists, per ARCH:CROSS_DOMAIN_COMMUNICATION; this event is published
 * unconditionally, exactly as every other module's events are, whether or
 * not any subscriber currently exists.
 */
final class PaymentRefunded extends DomainEvent
{
    public function __construct(
        public readonly string $paymentId,
        public readonly string $orderId,
        public readonly ?string $customerId,
        public readonly string $gatewayCode,
        public readonly string $amount,
        public readonly string $currencyCode,
        public readonly ?string $refundReference,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'payments.payment.refunded';
    }
}
