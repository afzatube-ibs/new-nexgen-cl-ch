import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { PaymentDTO } from '@nexgen/api-client';
import { paymentsErrorMessage } from '../shared/errors.js';
import { useAttachBankTransferProof } from './queries.js';

export interface BankTransferProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentDTO;
}

/**
 * `AttachBankTransferProofAction` — `proof_reference` is a plain identifier
 * string (`AttachBankTransferProofRequest`'s own rule), a future
 * Media-module attachment id — this dialog never handles an actual file
 * upload, matching the real backend's own "Proof Upload Extension Point"
 * (confirmed via the request class's own docblock). No status guard exists
 * on the real Action — a proof reference can be attached at any point,
 * including on an already-terminal payment, so this dialog is offered
 * unconditionally whenever the caller has `payments.payments.manage`.
 */
export function BankTransferProofDialog({ open, onOpenChange, payment }: BankTransferProofDialogProps) {
  const { toast } = useToast();
  const attachMutation = useAttachBankTransferProof();
  const [proofReference, setProofReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProofReference(payment.proofReference ?? '');
      setError(null);
    }
  }, [open, payment.proofReference]);

  async function handleConfirm(): Promise<void> {
    if (!proofReference.trim()) {
      setError('A proof reference is required.');
      return;
    }
    setError(null);
    try {
      await attachMutation.mutateAsync({ id: payment.id, input: { proofReference: proofReference.trim(), expectedVersion: payment.version } });
      toast({ variant: 'success', title: 'Bank transfer proof attached' });
      onOpenChange(false);
    } catch (err) {
      setError(paymentsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Attach bank transfer proof</DialogTitle>
          <DialogDescription>
            Record a reference for the proof of transfer the customer provided (e.g. a bank reference number or receipt id). This is an identifier only — no file is uploaded here.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Input label="Proof reference" placeholder="e.g. TXN-2026081712345" maxLength={255} value={proofReference} onChange={(e) => setProofReference(e.target.value)} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={attachMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} loading={attachMutation.isPending}>
            Attach proof
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
