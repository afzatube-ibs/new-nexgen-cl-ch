<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\ExchangeRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use Illuminate\Support\Facades\DB;

final readonly class StartExchangePreparingAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ExchangeRequest $exchangeRequest, int $expectedVersion, ?string $actorId): ExchangeRequest
    {
        return DB::transaction(function () use ($exchangeRequest, $expectedVersion, $actorId) {
            $exchangeRequest->assertVersionMatches($expectedVersion);

            if (! $exchangeRequest->canTransitionTo(ExchangeRequest::STATUS_PREPARING)) {
                throw new ReturnValidationException('invalid_exchange_transition', "Exchange request [{$exchangeRequest->id}] cannot start preparing from [{$exchangeRequest->status}].");
            }

            $exchangeRequest->status = ExchangeRequest::STATUS_PREPARING;
            $exchangeRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $exchangeRequest->return_request_id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Replacement item being prepared.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'exchange_request.preparing',
                actorId: $actorId,
                targetType: ExchangeRequest::class,
                targetId: $exchangeRequest->id,
                after: ['status' => $exchangeRequest->status],
            );

            return $exchangeRequest;
        });
    }
}
