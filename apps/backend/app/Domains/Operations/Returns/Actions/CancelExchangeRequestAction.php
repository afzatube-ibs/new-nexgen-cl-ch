<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\ExchangeRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use Illuminate\Support\Facades\DB;

final readonly class CancelExchangeRequestAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ExchangeRequest $exchangeRequest, int $expectedVersion, ?string $actorId): ExchangeRequest
    {
        return DB::transaction(function () use ($exchangeRequest, $expectedVersion, $actorId) {
            $exchangeRequest->assertVersionMatches($expectedVersion);

            if (! $exchangeRequest->canTransitionTo(ExchangeRequest::STATUS_CANCELLED)) {
                throw new ReturnValidationException('invalid_exchange_transition', "Exchange request [{$exchangeRequest->id}] cannot be cancelled from [{$exchangeRequest->status}].");
            }

            $exchangeRequest->status = ExchangeRequest::STATUS_CANCELLED;
            $exchangeRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $exchangeRequest->return_request_id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Exchange cancelled.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'exchange_request.cancelled',
                actorId: $actorId,
                targetType: ExchangeRequest::class,
                targetId: $exchangeRequest->id,
                after: ['status' => $exchangeRequest->status],
            );

            return $exchangeRequest;
        });
    }
}
