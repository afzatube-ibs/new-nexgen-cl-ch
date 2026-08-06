<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\RefundRequest;
use Illuminate\Support\Facades\DB;

/**
 * pending|failed -> processing. Called at the start of app/Listeners/
 * ProcessRefundOnReturnResolved.php's handling, before it ever calls
 * Payments — so a RefundRequest never sits silently in `pending` while a
 * gateway call is genuinely in flight, matching DATA:VERSIONING's
 * "surfaced explicitly" spirit applied to state, not just conflicts. Also
 * the first step of Actions\RetryRefundRequestAction's retry path (failed
 * -> processing).
 */
final readonly class StartRefundProcessingAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(RefundRequest $refundRequest): RefundRequest
    {
        return DB::transaction(function () use ($refundRequest) {
            /** @var RefundRequest $refundRequest */
            $refundRequest = RefundRequest::query()->lockForUpdate()->findOrFail($refundRequest->id);

            if (! $refundRequest->canTransitionTo(RefundRequest::STATUS_PROCESSING)) {
                throw new ReturnValidationException('refund_not_processable', "Refund request [{$refundRequest->id}] cannot start processing from [{$refundRequest->status}].");
            }

            $previousStatus = $refundRequest->status;
            $refundRequest->status = RefundRequest::STATUS_PROCESSING;
            $refundRequest->save();

            $this->auditLogger->log(
                action: 'refund_request.processing_started',
                actorId: null,
                targetType: RefundRequest::class,
                targetId: $refundRequest->id,
                before: ['status' => $previousStatus],
                after: ['status' => $refundRequest->status],
            );

            return $refundRequest;
        });
    }
}
