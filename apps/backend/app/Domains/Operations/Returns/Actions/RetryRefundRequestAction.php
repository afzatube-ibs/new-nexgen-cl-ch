<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Events\ReturnResolved;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\RefundRequest;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;

/**
 * Operator-facing recovery path for a RefundRequest that
 * Actions\MarkRefundFailedAction recorded as failed (unavailable gateway,
 * a transient failure on the gateway's own end). Re-publishes
 * Events\ReturnResolved with this RefundRequest's own stored details,
 * which app/Listeners/ProcessRefundOnReturnResolved.php reacts to
 * exactly as it did the first time — this Action itself never calls
 * Payments directly, preserving the same cross-domain event-only boundary
 * the original resolution flow observes.
 */
final readonly class RetryRefundRequestAction
{
    public function __construct(private DomainEventBus $eventBus) {}

    public function execute(RefundRequest $refundRequest): RefundRequest
    {
        if ($refundRequest->status !== RefundRequest::STATUS_FAILED) {
            throw new ReturnValidationException('refund_not_retryable', "Refund request [{$refundRequest->id}] is not in a failed state.");
        }

        $orderId = $refundRequest->returnRequest()->value('order_id') ?? '';

        $this->eventBus->publish(new ReturnResolved(
            returnRequestId: $refundRequest->return_request_id,
            orderId: $orderId,
            resolution: 'refund',
            refundRequestId: $refundRequest->id,
            paymentId: $refundRequest->payment_id,
            amount: $refundRequest->amount,
            currencyCode: $refundRequest->currency_code,
        ));

        return $refundRequest->fresh() ?? $refundRequest;
    }
}
