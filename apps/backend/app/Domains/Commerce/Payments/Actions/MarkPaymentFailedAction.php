<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Events\PaymentFailed;
use App\Domains\Commerce\Payments\Exceptions\InvalidPaymentStatusTransitionException;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * "Payment Failure" — pending/authorized -> failed. Single-aggregate
 * transaction against Payment alone, per DATA:TRANSACTION_BOUNDARIES.
 * `$reason` is stored on Payment and republished on the event verbatim,
 * so callers must pass a short, human-readable summary — never a
 * gateway's raw response body (SECURITY:EVENT_SECURITY) — the full raw
 * response still lands in the PaymentAttempt row this action creates,
 * which is Confidential audit data, not broadcast on the event bus.
 *
 * `$expectedVersion` follows the same optional, dual-caller convention
 * documented on Actions\CapturePaymentAction: non-null for a client-
 * initiated call (this action re-locks and re-checks the row itself),
 * null for a system-initiated call that already holds the row's lock as
 * part of its own outer transaction.
 */
final readonly class MarkPaymentFailedAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>|null  $responsePayload
     */
    public function execute(
        Payment $payment,
        string $reason,
        ?string $gatewayReference,
        ?array $responsePayload,
        ?int $expectedVersion,
        ?string $actorId,
    ): Payment {
        return DB::transaction(function () use ($payment, $reason, $gatewayReference, $responsePayload, $expectedVersion, $actorId) {
            if ($expectedVersion !== null) {
                /** @var Payment $payment */
                $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
                $payment->assertVersionMatches($expectedVersion);
            }

            if (! $payment->canTransitionTo(Payment::STATUS_FAILED)) {
                throw new InvalidPaymentStatusTransitionException($payment->id, $payment->status, Payment::STATUS_FAILED);
            }

            $previousStatus = $payment->status;
            $payment->status = Payment::STATUS_FAILED;
            $payment->failure_reason = $reason;
            $payment->failed_at = now();
            $payment->save();

            $payment->attempts()->create([
                'type' => PaymentAttempt::TYPE_FAILURE,
                'status' => PaymentAttempt::STATUS_FAILED,
                'gateway_code' => $payment->gateway_code,
                'gateway_reference' => $gatewayReference,
                'currency_code' => $payment->currency_code,
                'failure_reason' => $reason,
                'response_payload' => $responsePayload,
            ]);

            $this->auditLogger->log(
                action: 'payment.failed',
                actorId: $actorId,
                targetType: Payment::class,
                targetId: $payment->id,
                before: ['status' => $previousStatus],
                after: ['status' => $payment->status, 'reason' => $reason],
            );

            $this->eventBus->publish(new PaymentFailed(
                paymentId: $payment->id,
                orderId: $payment->order_id,
                gatewayCode: $payment->gateway_code,
                reason: $reason,
            ));

            return $payment;
        });
    }
}
