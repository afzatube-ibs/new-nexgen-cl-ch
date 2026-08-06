<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Events\PaymentRefunded;
use App\Domains\Commerce\Payments\Exceptions\PaymentValidationException;
use App\Domains\Commerce\Payments\Gateways\Contracts\RefundableGateway;
use App\Domains\Commerce\Payments\Gateways\GatewayResolver;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * "Refund Extension Point" exercised — Gateways\Contracts\
 * RefundableGateway::refund() was built with no caller in this module by
 * design (see that interface's own docblock: "full refund workflow ...
 * is Returns' concern"); this Action is that caller, added when the
 * Returns module (`MODULE:RETURNS`) was built.
 *
 * Called only by app/Listeners/ProcessRefundOnReturnResolved.php — the
 * neutral, cross-domain integration listener that bridges Returns'
 * (Operations) `ReturnResolved` event to this module's (Commerce) own
 * Action, per ARCH:CROSS_DOMAIN_COMMUNICATION. This Action itself has no
 * knowledge that Returns exists — it accepts a payment id, an amount, and
 * a reason, exactly the shape any future caller (a manual operator-
 * initiated refund, a different future module) would also need, never a
 * Returns-specific parameter.
 *
 * Deliberately gateway-agnostic, exactly like every other Action in this
 * module: never branches on which concrete gateway it holds. A gateway
 * that does not implement RefundableGateway at all (most of this
 * project's gateways do not — only Gateways\BkashGateway does, per that
 * interface's own docblock) fails this Action loudly via
 * PaymentValidationException, never silently.
 */
final readonly class RefundPaymentAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
        private GatewayResolver $gatewayResolver,
    ) {}

    public function execute(Payment $payment, string $amount, ?string $reason, ?string $actorId): Payment
    {
        return DB::transaction(function () use ($payment, $amount, $reason, $actorId) {
            /** @var Payment $payment */
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if (! in_array($payment->status, [Payment::STATUS_CAPTURED, Payment::STATUS_PARTIALLY_REFUNDED], true)) {
                throw new PaymentValidationException('payment_not_refundable', "Payment [{$payment->id}] is not in a refundable state (currently [{$payment->status}]).");
            }

            $amountCaptured = $this->numeric($payment->amount_captured);
            $amountRefunded = $this->numeric($payment->amount_refunded);
            $refundAmount = $this->numeric($amount);

            $refundable = bcsub($amountCaptured, $amountRefunded, 4);

            if (bccomp($refundAmount, $refundable, 4) === 1) {
                throw new PaymentValidationException('amount_exceeds_refundable', "Refund amount {$amount} exceeds the refundable balance {$refundable} on Payment [{$payment->id}].");
            }

            $gateway = $this->gatewayResolver->resolve($payment->gateway_code);

            if (! $gateway instanceof RefundableGateway) {
                throw new PaymentValidationException('refund_not_supported', "Gateway [{$payment->gateway_code}] does not support refunds.");
            }

            $result = $gateway->refund($payment->id, $amount, $reason);

            $newAmountRefunded = bcadd($amountRefunded, $refundAmount, 4);
            $isFullyRefunded = bccomp($newAmountRefunded, $amountCaptured, 4) === 0;
            $previousStatus = $payment->status;
            $targetStatus = $isFullyRefunded ? Payment::STATUS_REFUNDED : Payment::STATUS_PARTIALLY_REFUNDED;

            if (! $payment->canTransitionTo($targetStatus)) {
                throw new PaymentValidationException('invalid_refund_transition', "Payment [{$payment->id}] cannot transition from [{$payment->status}] to [{$targetStatus}].");
            }

            $payment->amount_refunded = $newAmountRefunded;
            $payment->status = $targetStatus;
            $payment->refunded_at ??= now();
            $payment->save();

            $payment->attempts()->create([
                'type' => PaymentAttempt::TYPE_REFUND,
                'status' => PaymentAttempt::STATUS_SUCCEEDED,
                'gateway_code' => $payment->gateway_code,
                'gateway_reference' => $result->refundReference,
                'amount' => $amount,
                'currency_code' => $payment->currency_code,
                'response_payload' => $result->raw,
            ]);

            $this->auditLogger->log(
                action: 'payment.refunded',
                actorId: $actorId,
                targetType: Payment::class,
                targetId: $payment->id,
                before: ['status' => $previousStatus, 'amount_refunded' => bcsub($newAmountRefunded, $refundAmount, 4)],
                after: ['status' => $payment->status, 'amount_refunded' => $payment->amount_refunded],
            );

            $this->eventBus->publish(new PaymentRefunded(
                paymentId: $payment->id,
                orderId: $payment->order_id,
                customerId: $payment->customer_id,
                gatewayCode: $payment->gateway_code,
                amount: $amount,
                currencyCode: $payment->currency_code,
                refundReference: $result->refundReference,
            ));

            return $payment;
        });
    }

    /**
     * @return numeric-string
     */
    private function numeric(string $value): string
    {
        if (! is_numeric($value)) {
            throw new InvalidArgumentException("Expected a numeric string, got [{$value}].");
        }

        return $value;
    }
}
