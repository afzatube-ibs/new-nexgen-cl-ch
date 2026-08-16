import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';
import { shippingErrorMessage } from '../shared/errors.js';
import { useMarkFailed } from './queries.js';

export interface ShipmentFailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: ShipmentDTO;
}

/**
 * `MarkFailedAction` — `reason` is `required` (`MarkFailedRequest`'s own
 * rule), unlike Cancel's optional one, so this is a dedicated small dialog
 * mirroring Orders' own `OrderCancelDialog`. A failed shipment is terminal
 * — re-fulfillment happens by creating a new Shipment, never resurrecting
 * this one (confirmed via `Shipment`'s own docblock), stated here too.
 */
export function ShipmentFailDialog({ open, onOpenChange, shipment }: ShipmentFailDialogProps) {
  const { toast } = useToast();
  const failMutation = useMarkFailed();
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
      setError('A reason is required to mark a shipment as failed.');
      return;
    }
    setError(null);
    try {
      await failMutation.mutateAsync({ id: shipment.id, input: { reason: reason.trim(), expectedVersion: shipment.version } });
      toast({ variant: 'success', title: 'Shipment marked failed' });
      onOpenChange(false);
    } catch (err) {
      setError(shippingErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Mark this shipment as failed?</DialogTitle>
          <DialogDescription>
            This is a final state — the parcel could not be delivered or fulfillment could not be completed. Re-fulfillment happens by creating a new shipment, not by reopening this one. State a reason — it&rsquo;s recorded on this shipment&rsquo;s timeline and audit log.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea
          label="Reason"
          placeholder="e.g. Parcel returned undelivered, item damaged in warehouse…"
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={failMutation.isPending}>
            Keep shipment
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} loading={failMutation.isPending}>
            Mark failed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
