<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Events\PaymentCancelled;
use App\Domains\Commerce\Payments\Exceptions\InvalidPaymentStatusTransitionException;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * "Payment Cancellation" — pending/authorized -> cancelled, distinct from
 * Actions\MarkPaymentFailedAction (the gateway itself rejected the
 * attempt). Single-aggregate transaction against Payment alone, per
 * DATA:TRANSACTION_BOUNDARIES.
 *
 * `$expectedVersion` follows the same optional, dual-caller convention
 * documented on Actions\CapturePaymentAction: non-null for a client-
 * initiated cancellation (a customer abandoning a gateway redirect, an
 * operator cancelling a Cash On Delivery order before delivery — this
 * action re-locks and re-checks the row itself rather than trusting a
 * controller's possibly-stale route-model-bound instance), null for a
 * system-initiated one (Actions\ProcessGatewayWebhookAction, when a
 * gateway itself reports a transaction as cancelled, e.g. SSLCommerz's
 * CANCELLED status or Nagad's Aborted status) that already holds the
 * row's lock as part of its own outer transaction.
 */
final readonly class CancelPaymentAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Payment $payment, string $reason, ?int $expectedVersion, ?string $actorId): Payment
    {
        return DB::transaction(function () use ($payment, $reason, $expectedVersion, $actorId) {
            if ($expectedVersion !== null) {
                /** @var Payment $payment */
                $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
                $payment->assertVersionMatches($expectedVersion);
            }

            if (! $payment->canTransitionTo(Payment::STATUS_CANCELLED)) {
                throw new InvalidPaymentStatusTransitionException($payment->id, $payment->status, Payment::STATUS_CANCELLED);
            }

            $previousStatus = $payment->status;
            $payment->status = Payment::STATUS_CANCELLED;
            $payment->cancelled_at = now();
            $payment->save();

            $payment->attempts()->create([
                'type' => PaymentAttempt::TYPE_CANCELLATION,
                'status' => PaymentAttempt::STATUS_SUCCEEDED,
                'gateway_code' => $payment->gateway_code,
                'currency_code' => $payment->currency_code,
                'failure_reason' => $reason,
            ]);

            $this->auditLogger->log(
                action: 'payment.cancelled',
                actorId: $actorId,
                targetType: Payment::class,
                targetId: $payment->id,
                before: ['status' => $previousStatus],
                after: ['status' => $payment->status, 'reason' => $reason],
            );

            $this->eventBus->publish(new PaymentCancelled(
                paymentId: $payment->id,
                orderId: $payment->order_id,
                gatewayCode: $payment->gateway_code,
                reason: $reason,
            ));

            return $payment;
        });
    }
}
