<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Events\ReturnRejected;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Reachable from requested, approved, pickup_scheduled, received, or
 * inspecting — a return can be found ineligible at any point before
 * resolution, per Models\ReturnRequest::ALLOWED_TRANSITIONS.
 */
final readonly class RejectReturnRequestAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(ReturnRequest $returnRequest, string $reason, int $expectedVersion, ?string $actorId): ReturnRequest
    {
        return DB::transaction(function () use ($returnRequest, $reason, $expectedVersion, $actorId) {
            $returnRequest->assertVersionMatches($expectedVersion);
            $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_REJECTED);

            $returnRequest->status = ReturnRequest::STATUS_REJECTED;
            $returnRequest->rejection_reason = $reason;
            $returnRequest->rejected_at = now();
            $returnRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Rejected: {$reason}",
                'occurred_at' => $returnRequest->rejected_at,
            ]);

            $this->auditLogger->log(
                action: 'return_request.rejected',
                actorId: $actorId,
                targetType: ReturnRequest::class,
                targetId: $returnRequest->id,
                after: ['status' => $returnRequest->status, 'rejection_reason' => $reason],
            );

            $this->eventBus->publish(new ReturnRejected(
                returnRequestId: $returnRequest->id,
                orderId: $returnRequest->order_id,
                reason: $reason,
            ));

            return $returnRequest;
        });
    }
}
