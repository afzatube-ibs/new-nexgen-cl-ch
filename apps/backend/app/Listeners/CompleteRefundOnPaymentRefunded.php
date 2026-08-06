<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Payments\Events\PaymentRefunded;
use App\Domains\Operations\Returns\Actions\CompleteRefundRequestAction;
use App\Domains\Operations\Returns\Models\RefundRequest;

/**
 * The reverse direction of ProcessRefundOnReturnResolved — see that
 * class's docblock for the full rationale behind this listener's
 * placement outside every domain's own namespace.
 *
 * Deliberately thin: finds the matching, still-processing RefundRequest
 * (by `payment_id`, per the refund_requests migration's own index) and
 * delegates entirely to Returns' own Actions\CompleteRefundRequestAction
 * — this class makes no decision of its own beyond "which RefundRequest
 * does this event belong to."
 *
 * Not every PaymentRefunded necessarily originated from a Returns
 * RefundRequest (a future manual, non-Returns-initiated refund path could
 * exist) — a miss here is a legitimate no-op, not an error.
 */
final readonly class CompleteRefundOnPaymentRefunded
{
    public function __construct(private CompleteRefundRequestAction $completeRefundRequestAction) {}

    public function handle(PaymentRefunded $event): void
    {
        $refundRequest = RefundRequest::query()
            ->where('payment_id', $event->paymentId)
            ->where('status', RefundRequest::STATUS_PROCESSING)
            ->latest('requested_at')
            ->first();

        if ($refundRequest === null) {
            return;
        }

        $this->completeRefundRequestAction->execute($refundRequest, $event->refundReference);
    }
}
