import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { PaymentDTO } from '@nexgen/api-client';
import { paymentsErrorMessage } from '../shared/errors.js';
import { useVoidPayment } from './queries.js';

export interface PaymentVoidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentDTO;
}

/**
 * `VoidPaymentAction` — `reason` is `required` (`VoidPaymentRequest`'s own
 * rule). Only reachable from `authorized` (`Models\Payment::TRANSITIONS`,
 * confirmed by reading it directly) — releasing a gateway reservation that
 * will never be captured. The caller (`PaymentWorkflowActions`) only offers
 * this dialog when `payment.status === 'authorized'`, matching the real
 * backend precondition rather than letting a doomed request 422.
 */
export function PaymentVoidDialog({ open, onOpenChange, payment }: PaymentVoidDialogProps) {
  const { toast } = useToast();
  const voidMutation = useVoidPayment();
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
      setError('A reason is required to void a payment.');
      return;
    }
    setError(null);
    try {
      await voidMutation.mutateAsync({ id: payment.id, input: { reason: reason.trim(), expectedVersion: payment.version } });
      toast({ variant: 'success', title: 'Payment voided' });
      onOpenChange(false);
    } catch (err) {
      setError(paymentsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Void this payment?</DialogTitle>
          <DialogDescription>
            The gateway authorization will be released without capturing any funds. This is a final state. State a reason — it&rsquo;s recorded on this payment&rsquo;s Transaction Timeline and audit log.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea
          label="Reason"
          placeholder="e.g. Authorization expired at the gateway, order was cancelled before capture…"
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={voidMutation.isPending}>
            Keep payment
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} loading={voidMutation.isPending}>
            Void payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
