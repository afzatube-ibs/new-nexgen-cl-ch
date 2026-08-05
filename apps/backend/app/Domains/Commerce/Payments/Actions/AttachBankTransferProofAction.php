<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Actions;

use App\Domains\Commerce\Payments\Audit\AuditLogger;
use App\Domains\Commerce\Payments\Models\Payment;
use Illuminate\Support\Facades\DB;

/**
 * "Proof Upload Extension Point" — stores only the identifier a future
 * Media module attachment would carry, per Models\Payment's
 * `proof_reference` column docblock; this action never handles the
 * actual file itself. Single-aggregate transaction against Payment
 * alone, per DATA:TRANSACTION_BOUNDARIES — re-locks (`lockForUpdate`) and
 * re-checks the row itself rather than trusting a controller's possibly-
 * stale route-model-bound instance, matching every other client-
 * initiated write in this module.
 */
final readonly class AttachBankTransferProofAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Payment $payment, string $proofReference, int $expectedVersion, ?string $actorId): Payment
    {
        return DB::transaction(function () use ($payment, $proofReference, $expectedVersion, $actorId) {
            /** @var Payment $payment */
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $payment->assertVersionMatches($expectedVersion);

            $previous = $payment->proof_reference;
            $payment->proof_reference = $proofReference;
            $payment->save();

            $this->auditLogger->log(
                action: 'payment.bank_transfer_proof_attached',
                actorId: $actorId,
                targetType: Payment::class,
                targetId: $payment->id,
                before: ['proof_reference' => $previous],
                after: ['proof_reference' => $proofReference],
            );

            return $payment;
        });
    }
}
