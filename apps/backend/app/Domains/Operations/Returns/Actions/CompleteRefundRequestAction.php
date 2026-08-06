<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Events\RefundIssued;
use App\Domains\Operations\Returns\Events\ReturnCompleted;
use App\Domains\Operations\Returns\Models\RefundRequest;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Called only by app/Listeners/CompleteRefundOnPaymentRefunded.php, once
 * Payments has confirmed (via its own PaymentRefunded event) that the
 * refund genuinely succeeded — this Action itself never calls Payments;
 * it only records the fact it was told. Marks both the RefundRequest and
 * its parent ReturnRequest complete in one transaction (same aggregate
 * family — RefundRequest and ReturnRequest are both owned by Returns,
 * so this is a legitimate single-module, if cross-aggregate,
 * coordination, unlike the cross-module Payments call itself).
 */
final readonly class CompleteRefundRequestAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(RefundRequest $refundRequest, ?string $gatewayReference): RefundRequest
    {
        return DB::transaction(function () use ($refundRequest, $gatewayReference) {
            /** @var RefundRequest $refundRequest */
            $refundRequest = RefundRequest::query()->lockForUpdate()->findOrFail($refundRequest->id);

            if ($refundRequest->isTerminal()) {
                return $refundRequest;
            }

            $refundRequest->status = RefundRequest::STATUS_COMPLETED;
            $refundRequest->gateway_reference = $gatewayReference;
            $refundRequest->completed_at = now();
            $refundRequest->save();

            /** @var ReturnRequest $returnRequest */
            $returnRequest = ReturnRequest::query()->lockForUpdate()->findOrFail($refundRequest->return_request_id);
            $returnRequest->assertCanTransitionTo(ReturnRequest::STATUS_COMPLETED);
            $returnRequest->status = ReturnRequest::STATUS_COMPLETED;
            $returnRequest->completed_at = now();
            $returnRequest->save();

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Refund issued ({$refundRequest->amount} {$refundRequest->currency_code}).",
                'occurred_at' => $refundRequest->completed_at,
            ]);

            $this->auditLogger->log(
                action: 'refund_request.completed',
                actorId: null,
                targetType: RefundRequest::class,
                targetId: $refundRequest->id,
                after: $refundRequest->only(['status', 'gateway_reference']),
            );

            $this->eventBus->publish(new RefundIssued(
                returnRequestId: $returnRequest->id,
                refundRequestId: $refundRequest->id,
                paymentId: $refundRequest->payment_id,
                amount: $refundRequest->amount,
                currencyCode: $refundRequest->currency_code,
            ));

            $this->eventBus->publish(new ReturnCompleted(
                returnRequestId: $returnRequest->id,
                orderId: $returnRequest->order_id,
                resolution: ReturnRequest::RESOLUTION_REFUND,
            ));

            return $refundRequest;
        });
    }
}
