<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Controllers;

use App\Domains\Commerce\Payments\Actions\CancelPaymentAction;
use App\Domains\Commerce\Payments\Actions\CapturePaymentAction;
use App\Domains\Commerce\Payments\Actions\VoidPaymentAction;
use App\Domains\Commerce\Payments\Http\Requests\CancelPaymentRequest;
use App\Domains\Commerce\Payments\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Payments\Http\Requests\VoidPaymentRequest;
use App\Domains\Commerce\Payments\Http\Resources\PaymentResource;
use App\Domains\Commerce\Payments\Models\Payment;

/**
 * "Payment Capture" / "Payment Cancellation" / "Void" made concrete as
 * one endpoint per named transition, mirroring Orders' own
 * OrderStatusController. `capture` here is the manual-confirmation path —
 * Cash On Delivery's "Confirmed" (cash collected), a currency an operator
 * declares by hand — distinct from the automatic capture Actions\
 * ProcessGatewayWebhookAction and Actions\InitiatePaymentAction apply for
 * gateways that report success on their own.
 */
final class PaymentActionController
{
    public function __construct(
        private readonly CapturePaymentAction $capturePaymentAction,
        private readonly CancelPaymentAction $cancelPaymentAction,
        private readonly VoidPaymentAction $voidPaymentAction,
    ) {}

    public function capture(ExpectedVersionRequest $request, Payment $payment): PaymentResource
    {
        $updated = $this->capturePaymentAction->execute(
            payment: $payment,
            amount: $payment->amount,
            gatewayReference: null,
            responsePayload: null,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PaymentResource($updated);
    }

    public function cancel(CancelPaymentRequest $request, Payment $payment): PaymentResource
    {
        $updated = $this->cancelPaymentAction->execute(
            payment: $payment,
            reason: $request->string('reason')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PaymentResource($updated);
    }

    public function void(VoidPaymentRequest $request, Payment $payment): PaymentResource
    {
        $updated = $this->voidPaymentAction->execute(
            payment: $payment,
            reason: $request->string('reason')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PaymentResource($updated);
    }
}
