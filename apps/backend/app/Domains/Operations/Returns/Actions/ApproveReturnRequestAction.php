<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Events\ReturnApproved;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class ApproveReturnRequestAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(ReturnRequest $returnRequest, int $expectedVersion, ?string $actorId): ReturnRequest
    {
        return DB::transaction(function () use ($returnRequest, $expectedVersion, $actorId) {
            $returnRequest->assertVersionMatches($expectedVersion);
            $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_APPROVED);

            $returnRequest->status = ReturnRequest::STATUS_APPROVED;
            $returnRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Return approved.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'return_request.approved',
                actorId: $actorId,
                targetType: ReturnRequest::class,
                targetId: $returnRequest->id,
                after: ['status' => $returnRequest->status],
            );

            $this->eventBus->publish(new ReturnApproved(
                returnRequestId: $returnRequest->id,
                orderId: $returnRequest->order_id,
            ));

            return $returnRequest;
        });
    }
}
