<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Events\ExchangeCompleted;
use App\Domains\Operations\Returns\Events\ReturnCompleted;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\ExchangeRequest;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class CompleteExchangeRequestAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(ExchangeRequest $exchangeRequest, int $expectedVersion, ?string $actorId): ExchangeRequest
    {
        return DB::transaction(function () use ($exchangeRequest, $expectedVersion, $actorId) {
            $exchangeRequest->assertVersionMatches($expectedVersion);

            if (! $exchangeRequest->canTransitionTo(ExchangeRequest::STATUS_COMPLETED)) {
                throw new ReturnValidationException('invalid_exchange_transition', "Exchange request [{$exchangeRequest->id}] cannot be completed from [{$exchangeRequest->status}].");
            }

            $exchangeRequest->status = ExchangeRequest::STATUS_COMPLETED;
            $exchangeRequest->completed_at = now();
            $exchangeRequest->save();

            /** @var ReturnRequest $returnRequest */
            $returnRequest = ReturnRequest::query()->lockForUpdate()->findOrFail($exchangeRequest->return_request_id);
            $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_COMPLETED);
            $returnRequest->status = ReturnRequest::STATUS_COMPLETED;
            $returnRequest->completed_at = now();
            $returnRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Exchange completed.',
                'occurred_at' => $exchangeRequest->completed_at,
            ]);

            $this->auditLogger->log(
                action: 'exchange_request.completed',
                actorId: $actorId,
                targetType: ExchangeRequest::class,
                targetId: $exchangeRequest->id,
                after: ['status' => $exchangeRequest->status],
            );

            $this->eventBus->publish(new ExchangeCompleted(
                returnRequestId: $returnRequest->id,
                exchangeRequestId: $exchangeRequest->id,
            ));

            $this->eventBus->publish(new ReturnCompleted(
                returnRequestId: $returnRequest->id,
                orderId: $returnRequest->order_id,
                resolution: ReturnRequest::RESOLUTION_EXCHANGE,
            ));

            return $exchangeRequest;
        });
    }
}
