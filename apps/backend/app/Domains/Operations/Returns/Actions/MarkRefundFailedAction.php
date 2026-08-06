<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Models\RefundRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Called only by app/Listeners/ProcessRefundOnReturnResolved.php, when
 * Payments' Actions\RefundPaymentAction throws (gateway does not support
 * refunds, amount exceeds the refundable balance, the gateway's own API
 * call fails). Per PRINCIPLES:EXPLICIT_FAILURE, this records the failure
 * on the RefundRequest itself rather than letting the exception propagate
 * uncaught out of a synchronous event-bus publish() call — the
 * ReturnRequest's own resolution has already committed by this point (its
 * transaction closed before Events\ReturnResolved was published), so
 * silently losing the failure would leave an operator with no visibility
 * into why the customer was never actually refunded. Actions\
 * RetryRefundRequestAction is the recovery path from here.
 */
final readonly class MarkRefundFailedAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(RefundRequest $refundRequest, string $reason): RefundRequest
    {
        return DB::transaction(function () use ($refundRequest, $reason) {
            /** @var RefundRequest $refundRequest */
            $refundRequest = RefundRequest::query()->lockForUpdate()->findOrFail($refundRequest->id);

            if ($refundRequest->isTerminal()) {
                return $refundRequest;
            }

            $refundRequest->status = RefundRequest::STATUS_FAILED;
            $refundRequest->failure_reason = $reason;
            $refundRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $refundRequest->return_request_id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Refund attempt failed: {$reason}",
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'refund_request.failed',
                actorId: null,
                targetType: RefundRequest::class,
                targetId: $refundRequest->id,
                after: ['status' => $refundRequest->status, 'failure_reason' => $reason],
            );

            return $refundRequest;
        });
    }
}
