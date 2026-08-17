import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { PaymentDTO } from '@nexgen/api-client';
import { paymentsErrorMessage } from '../shared/errors.js';
import { useRejectBankTransfer } from './queries.js';

export interface BankTransferRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentDTO;
}

/**
 * `RejectBankTransferRequest` — `reason` is `required`, `max:1000`
 * (confirmed by reading the request class directly). Internally reuses
 * `MarkPaymentFailedAction`, so it follows that Action's own transition
 * guard — reachable from `pending`/`authorized` only, matching
 * `canReject` in `PaymentWorkflowActions`. Gated by the distinct
 * `payments.bank_transfer.verify` permission, not `.manage`.
 */
export function BankTransferRejectDialog({ open, onOpenChange, payment }: BankTransferRejectDialogProps) {
  const { toast } = useToast();
  const rejectMutation = useRejectBankTransfer();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  async function handleConfirm(): Promise<void> {
    if (!reason.trim()) {
      setError('A reason is required to reject a bank transfer.');
      return;
    }
    setError(null);
    try {
      await rejectMutation.mutateAsync({ id: payment.id, input: { reason: reason.trim(), expectedVersion: payment.version } });
      toast({ variant: 'success', title: 'Bank transfer rejected' });
      onOpenChange(false);
    } catch (err) {
      setError(paymentsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Reject this bank transfer?</DialogTitle>
          <DialogDescription>
            The payment will be marked failed with the reason you give below. This is a final state. State a reason — it&rsquo;s recorded on this payment&rsquo;s Transaction Timeline and audit log.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea
          label="Reason"
          placeholder="e.g. Transfer reference could not be matched to any incoming payment…"
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={rejectMutation.isPending}>
            Keep pending
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} loading={rejectMutation.isPending}>
            Reject transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
