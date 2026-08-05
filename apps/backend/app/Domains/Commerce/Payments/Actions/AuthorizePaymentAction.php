<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Events\PaymentAuthorized;
use App\Domains\Commerce\Payments\Exceptions\InvalidPaymentStatusTransitionException;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * "Payment Authorization" — pending -> authorized. Single-aggregate
 * transaction against Payment alone, per DATA:TRANSACTION_BOUNDARIES.
 * Not every gateway in this module produces this transition (see
 * Events\PaymentAuthorized's docblock) — it exists for gateways whose
 * real API genuinely separates reserving funds from capturing them.
 *
 * `$expectedVersion` follows the same optional, dual-caller convention
 * documented on Actions\CapturePaymentAction.
 */
final readonly class AuthorizePaymentAction
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
        ?string $gatewayReference,
        ?array $responsePayload,
        ?int $expectedVersion,
        ?string $actorId,
    ): Payment {
        return DB::transaction(function () use ($payment, $gatewayReference, $responsePayload, $expectedVersion, $actorId) {
            if ($expectedVersion !== null) {
                /** @var Payment $payment */
                $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
                $payment->assertVersionMatches($expectedVersion);
            }

            if (! $payment->canTransitionTo(Payment::STATUS_AUTHORIZED)) {
                throw new InvalidPaymentStatusTransitionException($payment->id, $payment->status, Payment::STATUS_AUTHORIZED);
            }

            $previousStatus = $payment->status;
            $payment->status = Payment::STATUS_AUTHORIZED;
            $payment->authorized_at = now();
            $payment->save();

            $payment->attempts()->create([
                'type' => PaymentAttempt::TYPE_AUTHORIZATION,
                'status' => PaymentAttempt::STATUS_SUCCEEDED,
                'gateway_code' => $payment->gateway_code,
                'gateway_reference' => $gatewayReference,
                'amount' => $payment->amount,
                'currency_code' => $payment->currency_code,
                'response_payload' => $responsePayload,
            ]);

            $this->auditLogger->log(
                action: 'payment.authorized',
                actorId: $actorId,
                targetType: Payment::class,
                targetId: $payment->id,
                before: ['status' => $previousStatus],
                after: ['status' => $payment->status],
            );

            $this->eventBus->publish(new PaymentAuthorized(
                paymentId: $payment->id,
                orderId: $payment->order_id,
                gatewayCode: $payment->gateway_code,
                amount: $payment->amount,
                currencyCode: $payment->currency_code,
            ));

            return $payment;
        });
    }
}
