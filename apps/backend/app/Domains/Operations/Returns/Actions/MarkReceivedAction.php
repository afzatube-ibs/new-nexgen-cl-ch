<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use Illuminate\Support\Facades\DB;

final readonly class MarkReceivedAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ReturnRequest $returnRequest, int $expectedVersion, ?string $actorId): ReturnRequest
    {
        return DB::transaction(function () use ($returnRequest, $expectedVersion, $actorId) {
            $returnRequest->assertVersionMatches($expectedVersion);
            $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_RECEIVED);

            $returnRequest->status = ReturnRequest::STATUS_RECEIVED;
            $returnRequest->received_at = now();
            $returnRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Item received at warehouse.',
                'occurred_at' => $returnRequest->received_at,
            ]);

            $this->auditLogger->log(
                action: 'return_request.received',
                actorId: $actorId,
                targetType: ReturnRequest::class,
                targetId: $returnRequest->id,
                after: ['status' => $returnRequest->status, 'received_at' => $returnRequest->received_at->toIso8601String()],
            );

            return $returnRequest;
        });
    }
}
