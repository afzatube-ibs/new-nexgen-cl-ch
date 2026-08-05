<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Events\PaymentInitiated;
use App\Domains\Commerce\Payments\Exceptions\DuplicatePaymentException;
use App\Domains\Commerce\Payments\Gateways\GatewayResolver;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationRequest;
use App\Domains\Commerce\Payments\Gateways\Support\GatewayInitiationResult;
use App\Domains\Commerce\Payments\Models\Payment;
use App\Domains\Commerce\Payments\Models\PaymentAttempt;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * "Payment Authorization" begins here (initiation, not the transition of
 * the same name) — this module's entry point, and the only place it
 * reads Orders' Order model directly. Reads it exactly once, purely to
 * snapshot `grand_total`/`currency_code`/`customer_id` into the new
 * Payment (Payments MUST NOT calculate prices, taxes, or discounts — the
 * amount owed already exists on the Order by the time Checkout produced
 * it), mirroring the same narrow, read-only, snapshot-only dependency
 * Orders itself has on Customers (see Orders' CreateOrderAction
 * docblock). Payments never queries Catalog, Inventory, Pricing,
 * Promotions, or Customers directly — Orders is this module's one real
 * code-level dependency.
 *
 * Three distinct phases, deliberately never overlapping a database
 * transaction with a network call to an external gateway (a stronger,
 * more correct discipline than DATA:TRANSACTION_BOUNDARIES strictly
 * requires, but the natural extension of the same principle: a lock or
 * open transaction must never be held across I/O this module does not
 * control the latency of):
 *
 *  1. **Claim** — a single-aggregate transaction against Payment alone:
 *     lock any existing payments for this order, refuse a second
 *     concurrently-active one ("Duplicate Payment Protection"), then
 *     create the new Payment (status `pending`) and its own initial
 *     `initiation` PaymentAttempt row (status `pending`).
 *  2. **Call the gateway** — outside any transaction. For Cash On
 *     Delivery and Bank Transfer this is a pure local computation (no
 *     network call at all); for SSLCommerz/bKash/Nagad this is the real
 *     outbound HTTP request that starts a hosted checkout session.
 *  3. **Record the result** — a second single-aggregate transaction:
 *     updates the initiation PaymentAttempt with the gateway's response,
 *     and, for a gateway whose `initiate()` result is already terminal
 *     (Cash On Delivery's immediate `captured`, or any gateway reporting
 *     immediate `failed`), delegates to Actions\CapturePaymentAction or
 *     Actions\MarkPaymentFailedAction to apply that transition — the
 *     normal case (`pending`, awaiting the customer/gateway) leaves the
 *     Payment as initiated and returns.
 *
 * "Idempotency": a second `execute()` call carrying an already-used
 * `$idempotencyKey` short-circuits to the existing Payment before any of
 * the above runs, exactly like Checkout's own submission idempotency.
 */
final readonly class InitiatePaymentAction
{
    public function __construct(
        private GatewayResolver $gatewayResolver,
        private CapturePaymentAction $capturePaymentAction,
        private MarkPaymentFailedAction $markPaymentFailedAction,
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(string $orderId, string $gatewayCode, string $idempotencyKey, ?string $actorId): Payment
    {
        $existingByIdempotencyKey = Payment::query()->where('idempotency_key', $idempotencyKey)->first();

        if ($existingByIdempotencyKey !== null) {
            return $existingByIdempotencyKey;
        }

        /** @var Order $order */
        $order = Order::query()->findOrFail($orderId);

        $gateway = $this->gatewayResolver->resolve($gatewayCode);

        $payment = $this->claim($order, $gatewayCode, $idempotencyKey, $actorId);

        $callbackBase = rtrim((string) config('payments.checkout_return_url'), '/')."/payments/{$payment->id}";

        try {
            $result = $gateway->initiate(new GatewayInitiationRequest(
                paymentId: $payment->id,
                orderId: $order->id,
                amount: $payment->amount,
                currencyCode: $payment->currency_code,
                customerEmail: $order->customer_email,
                customerPhone: $order->customer_phone,
                description: "Order {$order->order_number}",
                successCallbackUrl: "{$callbackBase}/success",
                failureCallbackUrl: "{$callbackBase}/failure",
                cancelCallbackUrl: "{$callbackBase}/cancel",
            ));
        } catch (Throwable $e) {
            $this->recordFailedInitiation($payment, $e->getMessage(), $actorId);

            throw $e;
        }

        return $this->recordInitiationResult($payment, $result, $actorId);
    }

    /**
     * Step 1 — see this class's docblock. Single-aggregate transaction
     * against Payment alone.
     */
    private function claim(Order $order, string $gatewayCode, string $idempotencyKey, ?string $actorId): Payment
    {
        return DB::transaction(function () use ($order, $gatewayCode, $idempotencyKey, $actorId) {
            $active = Payment::query()
                ->where('order_id', $order->id)
                ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_AUTHORIZED])
                ->lockForUpdate()
                ->first();

            if ($active !== null) {
                throw new DuplicatePaymentException($order->id, $active->id);
            }

            $payment = Payment::query()->create([
                'order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'gateway_code' => $gatewayCode,
                'currency_code' => $order->currency_code,
                'amount' => $order->grand_total,
                'idempotency_key' => $idempotencyKey,
            ]);

            $payment->attempts()->create([
                'type' => PaymentAttempt::TYPE_INITIATION,
                'status' => PaymentAttempt::STATUS_PENDING,
                'gateway_code' => $gatewayCode,
                'amount' => $payment->amount,
                'currency_code' => $payment->currency_code,
            ]);

            $this->auditLogger->log(
                action: 'payment.initiated',
                actorId: $actorId,
                targetType: Payment::class,
                targetId: $payment->id,
                after: ['order_id' => $order->id, 'gateway_code' => $gatewayCode, 'amount' => $payment->amount],
            );

            $this->eventBus->publish(new PaymentInitiated(
                paymentId: $payment->id,
                orderId: $order->id,
                customerId: $payment->customer_id,
                gatewayCode: $gatewayCode,
                amount: $payment->amount,
                currencyCode: $payment->currency_code,
            ));

            return $payment;
        });
    }

    /**
     * Step 3 (success path) — see this class's docblock. Single-
     * aggregate transaction against Payment alone; delegates the terminal
     * transitions to their own dedicated actions rather than duplicating
     * their logic here.
     */
    private function recordInitiationResult(Payment $payment, GatewayInitiationResult $result, ?string $actorId): Payment
    {
        return DB::transaction(function () use ($payment, $result, $actorId) {
            /** @var Payment $locked */
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            // A fresh SELECT never carries `wasRecentlyCreated`, even for
            // a row inserted moments ago in this same request — restored
            // explicitly here so the controller's JsonResource still
            // renders 201 for a genuinely new payment (Laravel's own
            // convention, already relied on by Checkout's submission
            // controller) rather than the 200 a plain re-fetch would
            // otherwise produce for every initiation, new or not.
            $locked->wasRecentlyCreated = $payment->wasRecentlyCreated;

            $initiationAttempt = $locked->attempts()
                ->where('type', PaymentAttempt::TYPE_INITIATION)
                ->latest('created_at')
                ->first();

            $initiationAttempt?->update([
                'status' => $result->status === 'failed' ? PaymentAttempt::STATUS_FAILED : PaymentAttempt::STATUS_SUCCEEDED,
                'gateway_reference' => $result->gatewayReference,
                'response_payload' => $result->raw,
            ]);

            // Set, but do not yet save, on the locked instance: whichever
            // branch below runs next will persist these alongside its own
            // status change in the same UPDATE statement (the `default`
            // branch, the only one that does not already call ->save(),
            // saves explicitly itself) rather than this method issuing a
            // separate write every gateway response produces regardless
            // of outcome.
            $locked->redirect_url = $result->redirectUrl;
            $locked->instructions = $result->instructions;

            return match ($result->status) {
                'captured' => $this->capturePaymentAction->execute(
                    payment: $locked,
                    amount: $locked->amount,
                    gatewayReference: $result->gatewayReference,
                    responsePayload: $result->raw,
                    expectedVersion: null,
                    actorId: $actorId,
                ),
                'failed' => $this->markPaymentFailedAction->execute(
                    payment: $locked,
                    reason: 'The gateway rejected the payment at initiation.',
                    gatewayReference: $result->gatewayReference,
                    responsePayload: $result->raw,
                    expectedVersion: null,
                    actorId: $actorId,
                ),
                default => tap($locked, fn (Payment $p) => $p->save()),
            };
        });
    }

    private function recordFailedInitiation(Payment $payment, string $reason, ?string $actorId): void
    {
        DB::transaction(function () use ($payment, $reason, $actorId) {
            /** @var Payment $locked */
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $locked->wasRecentlyCreated = $payment->wasRecentlyCreated;

            $initiationAttempt = $locked->attempts()
                ->where('type', PaymentAttempt::TYPE_INITIATION)
                ->latest('created_at')
                ->first();

            $initiationAttempt?->update([
                'status' => PaymentAttempt::STATUS_FAILED,
                'failure_reason' => $reason,
            ]);

            $this->markPaymentFailedAction->execute(
                payment: $locked,
                reason: 'The payment gateway could not be reached.',
                gatewayReference: null,
                responsePayload: null,
                expectedVersion: null,
                actorId: $actorId,
            );
        });
    }
}
