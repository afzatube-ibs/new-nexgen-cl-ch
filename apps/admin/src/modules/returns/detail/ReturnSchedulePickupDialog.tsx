import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { ReturnRequestDTO } from '@nexgen/api-client';
import { returnsErrorMessage } from '../shared/errors.js';
import { useScheduleReturnPickup } from '../shared/queries.js';

export interface ReturnSchedulePickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnRequest: ReturnRequestDTO;
}

/**
 * `SchedulePickupAction` — both `providerCode`/`trackingNumber` genuinely
 * optional (`SchedulePickupRequest`, confirmed by reading it directly).
 * Unlike Shipment's own Dispatch dialog, `provider_code` here is a plain,
 * operator-typed string, not a picker over a real reference table — Returns
 * has no Courier Registry / Shipping Method equivalent of its own
 * (confirmed via a repo-wide search inside this domain: no such model
 * exists), so this is a free-text field, honestly, not a dressed-up lookup.
 */
export function ReturnSchedulePickupDialog({ open, onOpenChange, returnRequest }: ReturnSchedulePickupDialogProps) {
  const { toast } = useToast();
  const scheduleMutation = useScheduleReturnPickup();
  const [providerCode, setProviderCode] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProviderCode('');
      setTrackingNumber('');
      setError(null);
    }
  }, [open]);

  async function handleConfirm(): Promise<void> {
    setError(null);
    try {
      await scheduleMutation.mutateAsync({
        id: returnRequest.id,
        input: { providerCode: providerCode.trim() || null, trackingNumber: trackingNumber.trim() || null, expectedVersion: returnRequest.version },
      });
      toast({ variant: 'success', title: 'Pickup scheduled' });
      onOpenChange(false);
    } catch (err) {
      setError(returnsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Schedule pickup for this return?</DialogTitle>
          <DialogDescription>This return request will move to Pickup Scheduled. Both fields below are optional.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Input label="Provider (optional)" placeholder="e.g. courier-x" value={providerCode} onChange={(e) => setProviderCode(e.target.value)} />
        <Input label="Tracking number (optional)" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={scheduleMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} loading={scheduleMutation.isPending}>
            Schedule pickup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
