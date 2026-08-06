<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Events\ReturnCancelled;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Customer/operator-initiated withdrawal — only reachable before the item
 * is physically received back (requested/approved/pickup_scheduled), per
 * Models\ReturnRequest::ALLOWED_TRANSITIONS: once received, the correct
 * path is inspection followed by rejection, never a silent cancellation
 * of a physically-returned item.
 */
final readonly class CancelReturnRequestAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(ReturnRequest $returnRequest, int $expectedVersion, ?string $actorId): ReturnRequest
    {
        return DB::transaction(function () use ($returnRequest, $expectedVersion, $actorId) {
            $returnRequest->assertVersionMatches($expectedVersion);
            $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_CANCELLED);

            $returnRequest->status = ReturnRequest::STATUS_CANCELLED;
            $returnRequest->cancelled_at = now();
            $returnRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Cancelled.',
                'occurred_at' => $returnRequest->cancelled_at,
            ]);

            $this->auditLogger->log(
                action: 'return_request.cancelled',
                actorId: $actorId,
                targetType: ReturnRequest::class,
                targetId: $returnRequest->id,
                after: ['status' => $returnRequest->status],
            );

            $this->eventBus->publish(new ReturnCancelled(
                returnRequestId: $returnRequest->id,
                orderId: $returnRequest->order_id,
            ));

            return $returnRequest;
        });
    }
}
