<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\ExchangeRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Records the replacement item's dispatch reference. Deliberately not
 * wired to Fulfillment directly — per this module's own Future Extension
 * Points ("Exchange-specific inventory reservation logic (Phase 2)"), an
 * operator dispatches the replacement through Fulfillment's own,
 * unrelated manual-creation API and pastes the resulting tracking number
 * here; see Models\ExchangeRequest's own migration docblock.
 */
final readonly class MarkExchangeShippedAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ExchangeRequest $exchangeRequest, ?string $trackingNumber, int $expectedVersion, ?string $actorId): ExchangeRequest
    {
        return DB::transaction(function () use ($exchangeRequest, $trackingNumber, $expectedVersion, $actorId) {
            $exchangeRequest->assertVersionMatches($expectedVersion);

            if (! $exchangeRequest->canTransitionTo(ExchangeRequest::STATUS_SHIPPED)) {
                throw new ReturnValidationException('invalid_exchange_transition', "Exchange request [{$exchangeRequest->id}] cannot be marked shipped from [{$exchangeRequest->status}].");
            }

            $exchangeRequest->status = ExchangeRequest::STATUS_SHIPPED;
            $exchangeRequest->tracking_number = $trackingNumber;
            $exchangeRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $exchangeRequest->return_request_id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => $trackingNumber !== null ? "Replacement shipped. Tracking: {$trackingNumber}." : 'Replacement shipped.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'exchange_request.shipped',
                actorId: $actorId,
                targetType: ExchangeRequest::class,
                targetId: $exchangeRequest->id,
                after: $exchangeRequest->only(['status', 'tracking_number']),
            );

            return $exchangeRequest;
        });
    }
}
