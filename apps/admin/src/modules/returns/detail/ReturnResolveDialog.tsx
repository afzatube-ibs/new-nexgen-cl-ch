import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Textarea, Select, Alert, useToast } from '@nexgen/ui';
import type { ReturnRequestDTO, ReturnResolution } from '@nexgen/api-client';
import { returnsErrorMessage } from '../shared/errors.js';
import { useResolveReturnRequest } from '../shared/queries.js';

export interface ReturnResolveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnRequest: ReturnRequestDTO;
}

/**
 * `ResolveReturnRequestAction` — the one real decision point where staff
 * settle an inspected return: `refund` (creates a real `RefundRequest`,
 * moved automatically toward `completed` by the payment gateway's own async
 * side effects), `exchange` (creates a real `ExchangeRequest`, moved to
 * `completed` only by a later, explicit `ExchangeRequestController::
 * complete()` call from this same detail page's own Exchange sub-panel), or
 * `reject` (this return's own terminal rejection, distinct from the
 * `reject()` transition used at earlier stages). `ResolveReturnRequestRequest`
 * requires different fields per `resolution` (confirmed by reading it
 * directly) — this dialog enforces that conditional requirement
 * client-side, matching every other module's own "the backend validates,
 * the dialog pre-validates to avoid a pointless round trip" convention.
 */
export function ReturnResolveDialog({ open, onOpenChange, returnRequest }: ReturnResolveDialogProps) {
  const { toast } = useToast();
  const resolveMutation = useResolveReturnRequest();

  const [resolution, setResolution] = useState<ReturnResolution>('refund');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [desiredSku, setDesiredSku] = useState('');
  const [desiredDescription, setDesiredDescription] = useState('');
  const [desiredQuantity, setDesiredQuantity] = useState('1');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResolution('refund');
      setResolutionNotes('');
      setPaymentId('');
      setAmount('');
      setCurrencyCode('');
      setDesiredSku('');
      setDesiredDescription('');
      setDesiredQuantity('1');
      setError(null);
    }
  }, [open]);

  async function handleConfirm(): Promise<void> {
    setError(null);

    if (resolution === 'refund' && (!paymentId.trim() || !amount.trim() || !currencyCode.trim())) {
      setError('Payment ID, amount, and currency are all required for a refund.');
      return;
    }
    if (resolution === 'exchange' && (!desiredSku.trim() || !desiredQuantity.trim() || Number(desiredQuantity) < 1)) {
      setError('A desired SKU and a quantity of at least 1 are required for an exchange.');
      return;
    }

    try {
      await resolveMutation.mutateAsync({
        id: returnRequest.id,
        input: {
          resolution,
          resolutionNotes: resolutionNotes.trim() || null,
          ...(resolution === 'refund' ? { paymentId: paymentId.trim(), amount: amount.trim(), currencyCode: currencyCode.trim().toUpperCase() } : {}),
          ...(resolution === 'exchange'
            ? { desiredSku: desiredSku.trim(), desiredDescription: desiredDescription.trim() || null, desiredQuantity: Number(desiredQuantity) }
            : {}),
          expectedVersion: returnRequest.version,
        },
      });
      toast({ variant: 'success', title: 'Return request resolved' });
      onOpenChange(false);
    } catch (err) {
      setError(returnsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Resolve this return request</DialogTitle>
          <DialogDescription>
            Record the inspection outcome. A refund or exchange creates its own real record, tracked separately below on this page once resolved.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Select
          label="Resolution"
          value={resolution}
          onValueChange={(v) => setResolution(v as ReturnResolution)}
          options={[
            { value: 'refund', label: 'Refund' },
            { value: 'exchange', label: 'Exchange' },
            { value: 'reject', label: 'Reject (after inspection)' },
          ]}
        />

        {resolution === 'refund' && (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <Input label="Payment ID" hint="The original payment this refund is issued against." value={paymentId} onChange={(e) => setPaymentId(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Amount" placeholder="49.99" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Input label="Currency" placeholder="USD" maxLength={3} value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} />
            </div>
          </div>
        )}

        {resolution === 'exchange' && (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <Input label="Desired SKU" value={desiredSku} onChange={(e) => setDesiredSku(e.target.value)} />
            <Input label="Description (optional)" value={desiredDescription} onChange={(e) => setDesiredDescription(e.target.value)} />
            <Input label="Quantity" type="number" min={1} value={desiredQuantity} onChange={(e) => setDesiredQuantity(e.target.value)} />
          </div>
        )}

        {resolution === 'reject' && (
          <Alert variant="warning" role="status">
            This settles the return as rejected after inspection — a final state, distinct from an earlier-stage reject.
          </Alert>
        )}

        <Textarea
          label="Resolution notes (optional)"
          placeholder="Internal notes about this decision…"
          maxLength={2000}
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
        />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={resolveMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} loading={resolveMutation.isPending}>
            Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
