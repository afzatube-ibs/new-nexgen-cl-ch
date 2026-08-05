<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Gateways\GatewayResolver;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use Throwable;

/**
 * "Reconciliation" — catches a Payment whose webhook delivery never
 * arrived (a dropped IPN, a network partition between the gateway and
 * this platform) by directly querying each gateway for the current truth
 * of any Payment that has sat pending/authorized longer than
 * config('payments.reconciliation_threshold_minutes'), per Console\
 * Commands\ReconcilePaymentsCommand (`payments:reconcile`).
 *
 * Deliberately narrow: only gateways capable of being queried at all
 * (SSLCommerz, bKash, Nagad — anything implementing PaymentGatewayContract::
 * queryStatus() meaningfully) are examined; Cash On Delivery and Bank
 * Transfer have no external source of truth to reconcile against — their
 * status changes exclusively through this module's own manual-
 * verification actions, so a stale COD/Bank Transfer Payment is a
 * legitimate "still awaiting the courier/bank," not a signal of a missed
 * webhook.
 *
 * Reuses Actions\AuthorizePaymentAction / Actions\CapturePaymentAction /
 * Actions\MarkPaymentFailedAction / Actions\CancelPaymentAction for the
 * actual transition — this action's only job is deciding WHICH payments
 * need reconciling and asking each one's gateway what happened, never
 * reimplementing the transition logic those actions already own.
 */
final readonly class ReconcilePaymentsAction
{
    public function __construct(
        private GatewayResolver $gatewayResolver,
        private AuthorizePaymentAction $authorizePaymentAction,
        private CapturePaymentAction $capturePaymentAction,
        private MarkPaymentFailedAction $markPaymentFailedAction,
        private CancelPaymentAction $cancelPaymentAction,
    ) {}

    /**
     * @return array{checked: int, reconciled: int, errors: int}
     */
    public function execute(): array
    {
        $threshold = now()->subMinutes((int) config('payments.reconciliation_threshold_minutes'));

        $stalePayments = Payment::query()
            ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_AUTHORIZED])
            ->whereNotIn('gateway_code', ['cod', 'bank_transfer'])
            ->where('initiated_at', '<', $threshold)
            ->get();

        $checked = 0;
        $reconciled = 0;
        $errors = 0;

        foreach ($stalePayments as $payment) {
            $checked++;

            try {
                if ($this->reconcileOne($payment)) {
                    $reconciled++;
                }
            } catch (Throwable) {
                $errors++;
            }
        }

        return ['checked' => $checked, 'reconciled' => $reconciled, 'errors' => $errors];
    }

    private function reconcileOne(Payment $payment): bool
    {
        $gateway = $this->gatewayResolver->resolve($payment->gateway_code);

        /** @var PaymentAttempt|null $latestAttempt */
        $latestAttempt = $payment->attempts()
            ->whereNotNull('gateway_reference')
            ->latest('created_at')
            ->first();

        if ($latestAttempt === null || $latestAttempt->gateway_reference === null) {
            return false;
        }

        $result = $gateway->queryStatus($latestAttempt->gateway_reference);

        match ($result->status) {
            'authorized' => $payment->status === Payment::STATUS_PENDING
                ? $this->authorizePaymentAction->execute($payment, $latestAttempt->gateway_reference, $result->raw, null, null)
                : null,
            'captured' => $this->capturePaymentAction->execute($payment, $result->amount ?? $payment->amount, $latestAttempt->gateway_reference, $result->raw, null, null),
            'cancelled' => $this->cancelPaymentAction->execute($payment, 'Reconciliation found this payment cancelled at the gateway.', null, null),
            'failed' => $this->markPaymentFailedAction->execute($payment, 'Reconciliation found this payment failed at the gateway.', $latestAttempt->gateway_reference, $result->raw, null, null),
            default => null,
        };

        return $result->status !== 'pending';
    }
}
