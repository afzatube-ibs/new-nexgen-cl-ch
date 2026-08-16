import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Select, Alert, useToast } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';
import { shippingErrorMessage } from '../shared/errors.js';
import { useAllShippingMethods } from '../shared/queries.js';
import { useDispatchShipment } from './queries.js';

export interface ShipmentDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: ShipmentDTO;
}

/**
 * `DispatchShipmentAction` — real, existing capability only. Both fields
 * are genuinely optional per `DispatchShipmentRequest`, but this
 * installation's own Courier Registry has no provider with real credentials
 * configured (confirmed in `PHASE_2_8_SHIPPING_ARCHITECTURE.md` §2.3 and
 * re-confirmed live for this slice) — every provider reports
 * `isAvailable() === false` except `manual`, so `DispatchShipmentAction`
 * always falls through to requiring a manually-entered tracking number in
 * this environment. Rather than silently assuming that and marking the
 * field required client-side (which would misrepresent a courier that DOES
 * become available later), the real server error (`tracking_number_
 * required`) is surfaced verbatim if it occurs — this dialog states the
 * situation honestly in its own hint text instead of guessing.
 *
 * The Shipping Method picker reads Slice 1's own real, already-built
 * `useAllShippingMethods()` — no new endpoint, no invented picker.
 * Tracking Number is an operator-typed field going straight to the real
 * `tracking_number` param; this is consuming the backend's own accepted
 * manual-override path, not inventing a tracking number.
 */
export function ShipmentDispatchDialog({ open, onOpenChange, shipment }: ShipmentDispatchDialogProps) {
  const { toast } = useToast();
  const dispatchMutation = useDispatchShipment();
  const { data: methods } = useAllShippingMethods();

  const [shippingMethodId, setShippingMethodId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setShippingMethodId('');
      setTrackingNumber('');
      setError(null);
    }
  }, [open]);

  const methodOptions = useMemo(
    () => [{ value: '', label: 'None (self-fulfilled / decide at dispatch)' }, ...(methods ?? []).filter((m) => m.status === 'active').map((m) => ({ value: m.id, label: m.name }))],
    [methods],
  );

  async function handleConfirm(): Promise<void> {
    setError(null);
    try {
      await dispatchMutation.mutateAsync({
        id: shipment.id,
        input: { shippingMethodId: shippingMethodId || null, trackingNumber: trackingNumber.trim() || null, expectedVersion: shipment.version },
      });
      toast({ variant: 'success', title: 'Shipment dispatched' });
      onOpenChange(false);
    } catch (err) {
      setError(shippingErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Dispatch this shipment?</DialogTitle>
          <DialogDescription>
            This shipment will move to Dispatched. No courier in this installation has live credentials configured, so a tracking number must be entered manually below — the real dispatch will fail with a clear error otherwise.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Select label="Shipping method (optional)" value={shippingMethodId} onValueChange={setShippingMethodId} options={methodOptions} />
        <Input
          label="Tracking number"
          hint="From the courier's own consignment note, or your own reference for self-managed dispatch."
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={dispatchMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} loading={dispatchMutation.isPending}>
            Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
