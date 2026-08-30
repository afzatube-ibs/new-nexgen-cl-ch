import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { ExchangeRequestDTO } from '@nexgen/api-client';
import { returnsErrorMessage } from '../shared/errors.js';
import { useMarkExchangeShipped } from '../shared/queries.js';

export interface ReturnMarkExchangeShippedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exchangeRequest: ExchangeRequestDTO;
  returnRequestId: string;
}

/** `ExchangeRequestController::markShipped` — `MarkExchangeShippedRequest`: `tracking_number` optional, `expected_version` required (confirmed by reading it directly). */
export function ReturnMarkExchangeShippedDialog({ open, onOpenChange, exchangeRequest, returnRequestId }: ReturnMarkExchangeShippedDialogProps) {
  const { toast } = useToast();
  const shipMutation = useMarkExchangeShipped();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTrackingNumber('');
      setError(null);
    }
  }, [open]);

  async function handleConfirm(): Promise<void> {
    setError(null);
    try {
      await shipMutation.mutateAsync({
        exchangeRequestId: exchangeRequest.id,
        returnRequestId,
        input: { trackingNumber: trackingNumber.trim() || null, expectedVersion: exchangeRequest.version },
      });
      toast({ variant: 'success', title: 'Exchange marked shipped' });
      onOpenChange(false);
    } catch (err) {
      setError(returnsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Mark this exchange shipped?</DialogTitle>
          <DialogDescription>The replacement item has been shipped to the customer. A tracking number is optional.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Input label="Tracking number (optional)" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={shipMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} loading={shipMutation.isPending}>
            Mark shipped
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
