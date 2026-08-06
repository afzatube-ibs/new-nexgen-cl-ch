<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Events\ReturnResolved;
use App\Domains\Operations\Returns\Exceptions\ReturnValidationException;
use App\Domains\Operations\Returns\Models\ExchangeRequest;
use App\Domains\Operations\Returns\Models\RefundRequest;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * The pivotal decision this module exists to make: inspecting ->
 * resolution_approved, deciding refund / exchange / reject. A resolution
 * of `reject` here (an inspected-but-declined item — e.g. not actually
 * defective) is distinct from Actions\RejectReturnRequestAction (declined
 * before receipt) — both land on Models\ReturnRequest::STATUS_REJECTED,
 * but only this path has actually inspected the item first; the
 * `rejection_reason` column captures which happened.
 *
 * A `refund` resolution creates a Models\RefundRequest child (per-
 * aggregate reasoning in that model's own migration docblock) and
 * publishes Events\ReturnResolved, which app/Listeners/
 * ProcessRefundOnReturnResolved.php reacts to — this Action itself never
 * calls Payments directly (forbidden cross-domain direct call, per
 * MODULE:INTERACTION_RULES); it only creates the record and states the
 * fact that a refund was decided. An `exchange` resolution creates a
 * Models\ExchangeRequest child instead, entirely within this module (same
 * aggregate family, no cross-domain concern).
 */
final readonly class ResolveReturnRequestAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array{amount?: string, currency_code?: string, payment_id?: string, desired_sku?: string, desired_description?: string|null, desired_quantity?: int}  $resolutionDetails
     */
    public function execute(
        ReturnRequest $returnRequest,
        string $resolution,
        ?string $resolutionNotes,
        array $resolutionDetails,
        int $expectedVersion,
        ?string $actorId,
    ): ReturnRequest {
        if (! in_array($resolution, [ReturnRequest::RESOLUTION_REFUND, ReturnRequest::RESOLUTION_EXCHANGE, ReturnRequest::RESOLUTION_REJECT], true)) {
            throw new ReturnValidationException('invalid_resolution', "Resolution [{$resolution}] is not recognized.");
        }

        if ($resolution === ReturnRequest::RESOLUTION_EXCHANGE && ! $returnRequest->isExchange()) {
            throw new ReturnValidationException('not_an_exchange_request', "Return request [{$returnRequest->id}] was not filed as an exchange.");
        }

        return DB::transaction(function () use ($returnRequest, $resolution, $resolutionNotes, $resolutionDetails, $expectedVersion, $actorId) {
            $returnRequest->assertVersionMatches($expectedVersion);

            if ($resolution === ReturnRequest::RESOLUTION_REJECT) {
                $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_REJECTED);
                $returnRequest->status = ReturnRequest::STATUS_REJECTED;
                $returnRequest->resolution = $resolution;
                $returnRequest->resolution_notes = $resolutionNotes;
                $returnRequest->rejection_reason = $resolutionNotes ?? 'Rejected after inspection.';
                $returnRequest->rejected_at = now();
                $returnRequest->save();

                ReturnTimelineEvent::query()->create([
                    'return_request_id' => $returnRequest->id,
                    'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                    'description' => 'Rejected after inspection.',
                    'occurred_at' => $returnRequest->rejected_at,
                ]);

                $this->auditLogger->log(
                    action: 'return_request.resolved',
                    actorId: $actorId,
                    targetType: ReturnRequest::class,
                    targetId: $returnRequest->id,
                    after: ['status' => $returnRequest->status, 'resolution' => $resolution],
                );

                return $returnRequest;
            }

            $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_RESOLUTION_APPROVED);
            $returnRequest->status = ReturnRequest::STATUS_RESOLUTION_APPROVED;
            $returnRequest->resolution = $resolution;
            $returnRequest->resolution_notes = $resolutionNotes;
            $returnRequest->resolved_at = now();
            $returnRequest->save();

            $refundRequestId = null;
            $paymentId = null;
            $amount = null;
            $currencyCode = null;

            if ($resolution === ReturnRequest::RESOLUTION_REFUND) {
                if (! isset($resolutionDetails['payment_id'], $resolutionDetails['amount'], $resolutionDetails['currency_code'])) {
                    throw new ReturnValidationException('missing_refund_details', 'A refund resolution requires payment_id, amount, and currency_code.');
                }

                $refundRequest = RefundRequest::query()->create([
                    'return_request_id' => $returnRequest->id,
                    'payment_id' => $resolutionDetails['payment_id'],
                    'amount' => $resolutionDetails['amount'],
                    'currency_code' => $resolutionDetails['currency_code'],
                ]);

                $refundRequestId = $refundRequest->id;
                $paymentId = $refundRequest->payment_id;
                $amount = $refundRequest->amount;
                $currencyCode = $refundRequest->currency_code;
            }

            if ($resolution === ReturnRequest::RESOLUTION_EXCHANGE) {
                if (! isset($resolutionDetails['desired_sku'], $resolutionDetails['desired_quantity'])) {
                    throw new ReturnValidationException('missing_exchange_details', 'An exchange resolution requires desired_sku and desired_quantity.');
                }

                ExchangeRequest::query()->create([
                    'return_request_id' => $returnRequest->id,
                    'desired_sku' => $resolutionDetails['desired_sku'],
                    'desired_description' => $resolutionDetails['desired_description'] ?? null,
                    'desired_quantity' => $resolutionDetails['desired_quantity'],
                ]);
            }

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Resolved: {$resolution}.",
                'occurred_at' => $returnRequest->resolved_at,
            ]);

            $this->auditLogger->log(
                action: 'return_request.resolved',
                actorId: $actorId,
                targetType: ReturnRequest::class,
                targetId: $returnRequest->id,
                after: ['status' => $returnRequest->status, 'resolution' => $resolution],
            );

            $this->eventBus->publish(new ReturnResolved(
                returnRequestId: $returnRequest->id,
                orderId: $returnRequest->order_id,
                resolution: $resolution,
                refundRequestId: $refundRequestId,
                paymentId: $paymentId,
                amount: $amount,
                currencyCode: $currencyCode,
            ));

            return $returnRequest;
        });
    }
}
