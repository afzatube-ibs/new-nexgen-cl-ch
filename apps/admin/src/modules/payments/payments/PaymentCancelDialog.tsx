import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { PaymentDTO } from '@nexgen/api-client';
import { paymentsErrorMessage } from '../shared/errors.js';
import { useCancelPayment } from './queries.js';

export interface PaymentCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentDTO;
}

/**
 * `CancelPaymentAction` — `reason` is `required` (`CancelPaymentRequest`'s
 * own rule, confirmed by reading it directly), unlike Shipping's own
 * Cancel, whose reason is optional. Cancellation is reachable from
 * `pending`/`authorized` (`Models\Payment::TRANSITIONS`).
 */
export function PaymentCancelDialog({ open, onOpenChange, payment }: PaymentCancelDialogProps) {
  const { toast } = useToast();
  const cancelMutation = useCancelPayment();
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
      setError('A reason is required to cancel a payment.');
      return;
    }
    setError(null);
    try {
      await cancelMutation.mutateAsync({ id: payment.id, input: { reason: reason.trim(), expectedVersion: payment.version } });
      toast({ variant: 'success', title: 'Payment cancelled' });
      onOpenChange(false);
    } catch (err) {
      setError(paymentsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Cancel this payment?</DialogTitle>
          <DialogDescription>
            This is a final state — no further action can be taken on this payment. State a reason — it&rsquo;s recorded on this payment&rsquo;s Transaction Timeline and audit log.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea
          label="Reason"
          placeholder="e.g. Customer changed their mind, order was cancelled before payment completed…"
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={cancelMutation.isPending}>
            Keep payment
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} loading={cancelMutation.isPending}>
            Cancel payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
