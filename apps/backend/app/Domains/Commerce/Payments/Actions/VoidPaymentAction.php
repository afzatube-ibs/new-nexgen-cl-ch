<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Events\PaymentVoided;
use App\Domains\Commerce\Payments\Exceptions\InvalidPaymentStatusTransitionException;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * "Void" — authorized -> voided, releasing a reservation that will never
 * be captured. Always client/operator-initiated (unlike Actions\
 * CapturePaymentAction and its siblings, no gateway in this module's
 * Phase 1 Bangladesh-first lineup calls this path automatically), so
 * `$expectedVersion` is required here, exactly like Actions\
 * CancelPaymentAction. Single-aggregate transaction against Payment
 * alone, per DATA:TRANSACTION_BOUNDARIES.
 */
final readonly class VoidPaymentAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Payment $payment, string $reason, int $expectedVersion, ?string $actorId): Payment
    {
        return DB::transaction(function () use ($payment, $reason, $expectedVersion, $actorId) {
            /** @var Payment $payment */
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $payment->assertVersionMatches($expectedVersion);

            if (! $payment->canTransitionTo(Payment::STATUS_VOIDED)) {
                throw new InvalidPaymentStatusTransitionException($payment->id, $payment->status, Payment::STATUS_VOIDED);
            }

            $previousStatus = $payment->status;
            $payment->status = Payment::STATUS_VOIDED;
            $payment->save();

            $payment->attempts()->create([
                'type' => PaymentAttempt::TYPE_VOID,
                'status' => PaymentAttempt::STATUS_SUCCEEDED,
                'gateway_code' => $payment->gateway_code,
                'currency_code' => $payment->currency_code,
                'failure_reason' => $reason,
            ]);

            $this->auditLogger->log(
                action: 'payment.voided',
                actorId: $actorId,
                targetType: Payment::class,
                targetId: $payment->id,
                before: ['status' => $previousStatus],
                after: ['status' => $payment->status, 'reason' => $reason],
            );

            $this->eventBus->publish(new PaymentVoided(
                paymentId: $payment->id,
                orderId: $payment->order_id,
                gatewayCode: $payment->gateway_code,
                reason: $reason,
            ));

            return $payment;
        });
    }
}
