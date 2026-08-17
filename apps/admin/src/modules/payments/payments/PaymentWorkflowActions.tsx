import { useState } from 'react';
import { CreditCard, XCircle, Ban, FileCheck, CheckCircle2, ShieldX } from 'lucide-react';
import { Button, Text } from '@nexgen/ui';
import type { PaymentDTO } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { paymentsErrorMessage } from '../shared/errors.js';
import { useCapturePayment, useApproveBankTransfer } from './queries.js';
import { PaymentCancelDialog } from './PaymentCancelDialog.js';
import { PaymentVoidDialog } from './PaymentVoidDialog.js';
import { BankTransferProofDialog } from './BankTransferProofDialog.js';
import { BankTransferRejectDialog } from './BankTransferRejectDialog.js';

export interface PaymentWorkflowActionsProps {
  payment: PaymentDTO;
}

/**
 * Payments' own action bar — Phase 2.9 Slice 2 ("Merchant Payment
 * Operations"). One button per genuinely reachable next transition from
 * `payment.status`, confirmed against `Models\Payment::TRANSITIONS` directly
 * (not assumed): Capture and Cancel are reachable from `pending`/
 * `authorized`; Void only from `authorized` (releasing a gateway
 * reservation, never a captured payment). Gated by `payments.payments.manage`
 * — the general operator permission.
 *
 * `CapturePaymentAction` is genuinely gateway-agnostic (confirmed by reading
 * the Action directly — it never branches on `gatewayCode`), so Capture/
 * Cancel/Void are offered for every gateway including `bank_transfer`; the
 * backend does not restrict them to non-bank-transfer payments, and hiding
 * them here would invent an unenforced business rule.
 *
 * A separate Bank Transfer Verification section renders only when
 * `payment.gatewayCode === 'bank_transfer'`, gated by the genuinely distinct,
 * narrower `payments.bank_transfer.verify` permission (confirmed live via
 * the real backend's own `BankTransferVerificationTest`: `.manage` alone is
 * 403'd on approve/reject). Attach Proof has no status guard on the real
 * `AttachBankTransferProofAction` (confirmed by reading it directly) so it
 * is always offered; Approve/Reject follow the same `pending`/`authorized`
 * guard as Capture/Cancel since Approve reuses `CapturePaymentAction` and
 * Reject reuses `MarkPaymentFailedAction` internally.
 */
export function PaymentWorkflowActions({ payment }: PaymentWorkflowActionsProps) {
  const captureMutation = useCapturePayment();
  const approveMutation = useApproveBankTransfer();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const status = payment.status;
  const isBankTransfer = payment.gatewayCode === 'bank_transfer';

  const canCapture = status === 'pending' || status === 'authorized';
  const canCancel = status === 'pending' || status === 'authorized';
  const canVoid = status === 'authorized';
  const canApproveOrReject = status === 'pending' || status === 'authorized';

  const nothingAvailable = !canCapture && !canCancel && !canVoid && !(isBankTransfer && canApproveOrReject) && !isBankTransfer;

  if (nothingAvailable) {
    return (
      <Text variant="body" className="text-text-secondary">
        This payment is in a final state — no further workflow action is available.
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <RequirePermission anyOf={['payments.payments.manage']} inline={null}>
          {canCapture && (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <CreditCard className="size-4" /> Capture
                </Button>
              }
              title="Capture this payment?"
              description={`The full amount (${payment.amount} ${payment.currencyCode}) will be captured from the gateway. This payment will move to Captured.`}
              confirmLabel="Capture"
              onConfirm={async () => {
                await captureMutation.mutateAsync({ id: payment.id, input: { expectedVersion: payment.version } });
              }}
              getErrorMessage={paymentsErrorMessage}
            />
          )}
          {canVoid && (
            <Button variant="outline" onClick={() => setVoidOpen(true)}>
              <Ban className="size-4" /> Void
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger" onClick={() => setCancelOpen(true)}>
              <XCircle className="size-4" /> Cancel
            </Button>
          )}
        </RequirePermission>
      </div>

      {isBankTransfer && (
        <div className="flex flex-col gap-2 rounded-md border border-border-secondary p-3">
          <Text variant="body-strong">Bank transfer verification</Text>
          <div className="flex flex-wrap items-center gap-2">
            <RequirePermission anyOf={['payments.payments.manage']} inline={null}>
              <Button variant="outline" onClick={() => setProofOpen(true)}>
                <FileCheck className="size-4" /> {payment.proofReference ? 'Update proof' : 'Attach proof'}
              </Button>
            </RequirePermission>
            <RequirePermission anyOf={['payments.bank_transfer.verify']} inline={null}>
              {canApproveOrReject && (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline">
                      <CheckCircle2 className="size-4" /> Approve transfer
                    </Button>
                  }
                  title="Approve this bank transfer?"
                  description="This payment will be captured for its full amount and move to Captured."
                  confirmLabel="Approve"
                  onConfirm={async () => {
                    await approveMutation.mutateAsync({ id: payment.id, input: { expectedVersion: payment.version } });
                  }}
                  getErrorMessage={paymentsErrorMessage}
                />
              )}
              {canApproveOrReject && (
                <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger" onClick={() => setRejectOpen(true)}>
                  <ShieldX className="size-4" /> Reject transfer
                </Button>
              )}
            </RequirePermission>
          </div>
        </div>
      )}

      <PaymentCancelDialog open={cancelOpen} onOpenChange={setCancelOpen} payment={payment} />
      <PaymentVoidDialog open={voidOpen} onOpenChange={setVoidOpen} payment={payment} />
      <BankTransferProofDialog open={proofOpen} onOpenChange={setProofOpen} payment={payment} />
      <BankTransferRejectDialog open={rejectOpen} onOpenChange={setRejectOpen} payment={payment} />
    </div>
  );
}
