<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Events\PaymentCaptured;
use App\Domains\Commerce\Payments\Exceptions\InvalidPaymentStatusTransitionException;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * "Payment Capture" — this module's one success terminal transition.
 * Single-aggregate transaction against Payment (plus its own child
 * PaymentAttempt row) alone, per DATA:TRANSACTION_BOUNDARIES — exactly
 * like Orders' ConfirmOrderAction and every other module's status-
 * transition action.
 *
 * Deliberately gateway-agnostic: called identically whether the trigger
 * was a redirect-gateway's immediate success response (SSLCommerz, bKash,
 * Nagad), a verified webhook (Actions\ProcessGatewayWebhookAction), or an
 * operator confirming cash collected / a bank transfer arrived (Cash On
 * Delivery's "Confirmed," Bank Transfer's "Approved" — both map onto this
 * one `captured` status, per Models\Payment's docblock).
 *
 * `$expectedVersion` is optional, covering this action's two distinct
 * callers: a client-initiated HTTP request (an operator confirming COD
 * cash collected, or approving a bank transfer) supplies it, following a
 * prior read, exactly like every other module's DATA:VERSIONING-checked
 * transition — this action then re-locks the row itself (`lockForUpdate`)
 * before checking it, rather than trusting the possibly-stale in-memory
 * `$payment` a controller's route-model-binding loaded. A system-
 * initiated caller (Actions\ProcessGatewayWebhookAction, Actions\
 * InitiatePaymentAction's own immediate-capture path) has no client-
 * supplied version to check — it already holds this same row's lock as
 * part of its own outer transaction — and passes `null` to skip the
 * re-lock/version check and operate directly on the fresh instance it
 * already holds, mirroring Checkout's SubmitCheckoutAction claim()/
 * finalize() split between client-initiated and system-initiated writes.
 */
final readonly class CapturePaymentAction
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
        string $amount,
        ?string $gatewayReference,
        ?array $responsePayload,
        ?int $expectedVersion,
        ?string $actorId,
    ): Payment {
        return DB::transaction(function () use ($payment, $amount, $gatewayReference, $responsePayload, $expectedVersion, $actorId) {
            if ($expectedVersion !== null) {
                /** @var Payment $payment */
                $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
                $payment->assertVersionMatches($expectedVersion);
            }

            if (! $payment->canTransitionTo(Payment::STATUS_CAPTURED)) {
                throw new InvalidPaymentStatusTransitionException($payment->id, $payment->status, Payment::STATUS_CAPTURED);
            }

            $previousStatus = $payment->status;
            $payment->status = Payment::STATUS_CAPTURED;
            $payment->amount_captured = $amount;
            $payment->captured_at = now();
            $payment->save();

            $payment->attempts()->create([
                'type' => PaymentAttempt::TYPE_CAPTURE,
                'status' => PaymentAttempt::STATUS_SUCCEEDED,
                'gateway_code' => $payment->gateway_code,
                'gateway_reference' => $gatewayReference,
                'amount' => $amount,
                'currency_code' => $payment->currency_code,
                'response_payload' => $responsePayload,
            ]);

            $this->auditLogger->log(
                action: 'payment.captured',
                actorId: $actorId,
                targetType: Payment::class,
                targetId: $payment->id,
                before: ['status' => $previousStatus],
                after: ['status' => $payment->status, 'amount_captured' => $amount],
            );

            $this->eventBus->publish(new PaymentCaptured(
                paymentId: $payment->id,
                orderId: $payment->order_id,
                customerId: $payment->customer_id,
                gatewayCode: $payment->gateway_code,
                amount: $amount,
                currencyCode: $payment->currency_code,
            ));

            return $payment;
        });
    }
}
