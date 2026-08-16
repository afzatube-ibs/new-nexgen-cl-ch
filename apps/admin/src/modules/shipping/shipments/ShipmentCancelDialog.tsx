import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';
import { shippingErrorMessage } from '../shared/errors.js';
import { useCancelShipment } from './queries.js';

export interface ShipmentCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: ShipmentDTO;
}

/**
 * `CancelShipmentAction` — `reason` is genuinely optional
 * (`CancelShipmentRequest`), unlike Fail's required one. Only reachable
 * before dispatch (`Models\Shipment::ALLOWED_TRANSITIONS`, confirmed by
 * reading it directly) — once a courier has been booked or a manual
 * hand-off recorded, the correct path is Fail, never Cancel.
 */
export function ShipmentCancelDialog({ open, onOpenChange, shipment }: ShipmentCancelDialogProps) {
  const { toast } = useToast();
  const cancelMutation = useCancelShipment();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  async function handleConfirm(): Promise<void> {
    setError(null);
    try {
      await cancelMutation.mutateAsync({ id: shipment.id, input: { reason: reason.trim() || null, expectedVersion: shipment.version } });
      toast({ variant: 'success', title: 'Shipment cancelled' });
      onOpenChange(false);
    } catch (err) {
      setError(shippingErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Cancel this shipment?</DialogTitle>
          <DialogDescription>This shipment will move to Cancelled, a final state. An optional reason is recorded on this shipment&rsquo;s timeline and audit log.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea label="Reason" placeholder="Optional — e.g. Order cancelled by customer before pickup." maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={cancelMutation.isPending}>
            Keep shipment
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} loading={cancelMutation.isPending}>
            Cancel shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
