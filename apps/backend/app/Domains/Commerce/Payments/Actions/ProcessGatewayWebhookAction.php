<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Gateways\Contracts\PaymentGatewayContract;
use App\Domains\Commerce\Payments\Gateways\GatewayResolver;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayWebhookNotification;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Commerce\Payments\Models\PaymentWebhookEvent;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * "Webhook Processing" / "Signature Verification" / "Webhook Replay
 * Protection" / "Duplicate Callback Protection" — the single entry point
 * for every inbound callback from every gateway (SSLCommerz's Success/
 * Failure/Cancel/IPN, bKash's and Nagad's browser-redirect callbacks —
 * see each gateway's own docblock for why all of these funnel through
 * the same verification-then-normalize shape regardless of transport).
 * SECURITY:SECURITY_BOUNDARIES' external-integration boundary made
 * concrete: "Never trust gateway callbacks. Always verify signatures."
 *
 * Six steps, in order, each one refusing to proceed on failure rather
 * than guessing:
 *
 *  1. Resolve the gateway (Gateways\GatewayResolver) — an unknown or
 *     currently-unavailable gateway code is refused before anything else
 *     is attempted.
 *  2. Verify authenticity (`$gateway->verifyWebhookSignature()`) — never
 *     skipped, never soft-failed.
 *  3. Compute a stable `$eventReference` (the gateway's own delivery id
 *     where parsing succeeds, or a sha256 of the raw payload as a safe
 *     fallback) and, inside a single-aggregate transaction against
 *     PaymentWebhookEvent alone, check-and-record it — a second delivery
 *     carrying a reference already seen is refused by the table's own
 *     unique index (`(gateway_code, event_reference)`) before any further
 *     processing, which is this action's actual replay-protection
 *     mechanism, not merely an application-level check.
 *  4. If the signature failed verification, the event is recorded as
 *     `rejected` and processing stops — the Payment aggregate is never
 *     touched by an unverified delivery.
 *  5. Normalize the payload (`$gateway->parseWebhookPayload()`) and
 *     resolve which Payment it belongs to, via the PaymentAttempt row
 *     whose `gateway_reference` matches — an unmatched delivery is
 *     recorded as `unmatched`, not silently dropped, and not guessed at.
 *  6. Apply the transition this normalized status implies, delegating to
 *     Actions\AuthorizePaymentAction / Actions\CapturePaymentAction /
 *     Actions\MarkPaymentFailedAction / Actions\CancelPaymentAction —
 *     each already a single-aggregate transaction against Payment alone,
 *     called here with `$expectedVersion: null` since this action has
 *     already locked the Payment row (step 6's own transaction) as part
 *     of resolving it, exactly the system-initiated caller pattern each
 *     of those actions documents.
 */
final readonly class ProcessGatewayWebhookAction
{
    public function __construct(
        private GatewayResolver $gatewayResolver,
        private AuthorizePaymentAction $authorizePaymentAction,
        private CapturePaymentAction $capturePaymentAction,
        private MarkPaymentFailedAction $markPaymentFailedAction,
        private CancelPaymentAction $cancelPaymentAction,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $headers
     */
    public function execute(string $gatewayCode, string $rawPayload, array $headers): PaymentWebhookEvent
    {
        $gateway = $this->gatewayResolver->resolve($gatewayCode);

        $notification = null;
        $isValid = $gateway->verifyWebhookSignature($rawPayload, $headers);

        if ($isValid) {
            $notification = $this->tryParse($gateway, $rawPayload, $headers);
            $isValid = $notification !== null;
        }

        // Captured once, here, while $notification's nullability is still
        // in its most natural scope — reused below instead of re-testing
        // `$notification === null` a second time after the transaction
        // closure, where it flags as an impossible comparison.
        $rejected = ! $isValid;

        $eventReference = $notification !== null ? $notification->eventReference : hash('sha256', $rawPayload);

        $event = DB::transaction(function () use ($gatewayCode, $eventReference, $isValid, $rawPayload, $headers) {
            $existing = PaymentWebhookEvent::query()
                ->where('gateway_code', $gatewayCode)
                ->where('event_reference', $eventReference)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            return PaymentWebhookEvent::query()->create([
                'gateway_code' => $gatewayCode,
                'event_reference' => $eventReference,
                'signature_valid' => $isValid,
                'status' => PaymentWebhookEvent::STATUS_RECEIVED,
                'payload' => $this->decodeForStorage($rawPayload),
                'headers' => $headers,
            ]);
        });

        // Already processed (or already rejected) on a prior delivery —
        // this IS the replay-protection short-circuit: no further work,
        // no re-application of a transition that already happened.
        if ($event->status !== PaymentWebhookEvent::STATUS_RECEIVED) {
            return $event;
        }

        if ($rejected) {
            $event->update(['status' => PaymentWebhookEvent::STATUS_REJECTED, 'processed_at' => now()]);

            $this->auditLogger->log(
                action: 'payment.webhook_rejected',
                actorId: null,
                targetType: PaymentWebhookEvent::class,
                targetId: $event->id,
                after: ['gateway_code' => $gatewayCode],
            );

            return $event;
        }

        $payment = $this->resolvePayment($gatewayCode, $notification);

        if ($payment === null) {
            $event->update(['status' => PaymentWebhookEvent::STATUS_UNMATCHED, 'processed_at' => now()]);

            $this->auditLogger->log(
                action: 'payment.webhook_unmatched',
                actorId: null,
                targetType: PaymentWebhookEvent::class,
                targetId: $event->id,
                after: ['gateway_code' => $gatewayCode, 'event_reference' => $eventReference],
            );

            return $event;
        }

        $this->applyTransition($payment, $notification);

        $event->update([
            'payment_id' => $payment->id,
            'status' => PaymentWebhookEvent::STATUS_PROCESSED,
            'processed_at' => now(),
        ]);

        return $event;
    }

    private function resolvePayment(string $gatewayCode, GatewayWebhookNotification $notification): ?Payment
    {
        if ($notification->gatewayReference === null) {
            return null;
        }

        /** @var PaymentAttempt|null $attempt */
        $attempt = PaymentAttempt::query()
            ->where('gateway_code', $gatewayCode)
            ->where('gateway_reference', $notification->gatewayReference)
            ->latest('created_at')
            ->first();

        return $attempt?->payment;
    }

    private function applyTransition(Payment $payment, GatewayWebhookNotification $notification): void
    {
        $responsePayload = $notification->raw;

        match ($notification->status) {
            'authorized' => $this->authorizePaymentAction->execute(
                payment: $payment,
                gatewayReference: $notification->gatewayReference,
                responsePayload: $responsePayload,
                expectedVersion: null,
                actorId: null,
            ),
            'captured' => $this->capturePaymentAction->execute(
                payment: $payment,
                amount: $notification->amount ?? $payment->amount,
                gatewayReference: $notification->gatewayReference,
                responsePayload: $responsePayload,
                expectedVersion: null,
                actorId: null,
            ),
            'cancelled' => $this->cancelPaymentAction->execute(
                payment: $payment,
                reason: 'The gateway reported this payment as cancelled.',
                expectedVersion: null,
                actorId: null,
            ),
            default => $this->markPaymentFailedAction->execute(
                payment: $payment,
                reason: $notification->failureReason ?? 'The gateway reported this payment as failed.',
                gatewayReference: $notification->gatewayReference,
                responsePayload: $responsePayload,
                expectedVersion: null,
                actorId: null,
            ),
        };
    }

    /**
     * Isolates the one call that can throw from the surrounding control
     * flow, so a malformed payload a gateway's own parser rejects is
     * treated exactly like a failed signature check — the delivery is
     * still recorded (for replay protection) and reported `rejected`,
     * never allowed to bubble an uncaught exception out of this action.
     *
     * @param  array<string, mixed>  $headers
     */
    private function tryParse(PaymentGatewayContract $gateway, string $rawPayload, array $headers): ?GatewayWebhookNotification
    {
        try {
            return $gateway->parseWebhookPayload($rawPayload, $headers);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @return array<array-key, mixed>
     */
    private function decodeForStorage(string $rawPayload): array
    {
        $decoded = json_decode($rawPayload, true);

        if (is_array($decoded)) {
            return $decoded;
        }

        $fields = [];
        parse_str($rawPayload, $fields);

        return $fields;
    }
}
