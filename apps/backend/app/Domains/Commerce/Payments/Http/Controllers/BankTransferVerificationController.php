<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Controllers;

use App\Domains\Commerce\Payments\Actions\AttachBankTransferProofAction;
use App\Domains\Commerce\Payments\Actions\CapturePaymentAction;
use App\Domains\Commerce\Payments\Actions\MarkPaymentFailedAction;
use App\Domains\Commerce\Payments\Http\Requests\AttachBankTransferProofRequest;
use App\Domains\Commerce\Payments\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Payments\Http\Requests\RejectBankTransferRequest;
use App\Domains\Commerce\Payments\Http\Resources\PaymentResource;
use App\Domains\Commerce\Payments\Models\Payment;

/**
 * "Admin Verification" / "Approval" / "Rejection" — Bank Transfer's
 * entirely human-driven confirmation workflow (see Gateways\
 * BankTransferGateway's docblock for why this gateway has no automated
 * callback of its own). Gated by the narrower `payments.bank_transfer.
 * verify` permission rather than the general `payments.payments.manage`
 * one — see Authorization\PermissionRegistry's docblock.
 */
final class BankTransferVerificationController
{
    public function __construct(
        private readonly AttachBankTransferProofAction $attachBankTransferProofAction,
        private readonly CapturePaymentAction $capturePaymentAction,
        private readonly MarkPaymentFailedAction $markPaymentFailedAction,
    ) {}

    public function attachProof(AttachBankTransferProofRequest $request, Payment $payment): PaymentResource
    {
        $updated = $this->attachBankTransferProofAction->execute(
            payment: $payment,
            proofReference: $request->string('proof_reference')->toString(),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PaymentResource($updated);
    }

    public function approve(ExpectedVersionRequest $request, Payment $payment): PaymentResource
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

    public function reject(RejectBankTransferRequest $request, Payment $payment): PaymentResource
    {
        $updated = $this->markPaymentFailedAction->execute(
            payment: $payment,
            reason: $request->string('reason')->toString(),
            gatewayReference: null,
            responsePayload: null,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new PaymentResource($updated);
    }
}
