import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Checkbox, Alert, useToast } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';
import { shippingErrorMessage } from '../shared/errors.js';
import { useAddShipmentNote } from './queries.js';

export interface ShipmentNoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: ShipmentDTO;
}

/**
 * `AddShipmentNoteAction` — `fulfillment.shipments.manage`, append-only, no
 * status guard at all (confirmed by reading it directly — a note can be
 * added any time, including on a terminal shipment). Mirrors Orders' own
 * `OrderNoteFormDialog` exactly, including the same honest
 * `isCustomerVisible` treatment: tracked, but no customer-facing surface
 * reads it anywhere in this platform yet.
 */
export function ShipmentNoteFormDialog({ open, onOpenChange, shipment }: ShipmentNoteFormDialogProps) {
  const { toast } = useToast();
  const addNoteMutation = useAddShipmentNote();
  const [body, setBody] = useState('');
  const [isCustomerVisible, setIsCustomerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBody('');
      setIsCustomerVisible(false);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(): Promise<void> {
    if (!body.trim()) {
      setError('Note text is required.');
      return;
    }
    setError(null);
    try {
      await addNoteMutation.mutateAsync({ id: shipment.id, input: { body: body.trim(), isCustomerVisible } });
      toast({ variant: 'success', title: 'Note added' });
      onOpenChange(false);
    } catch (err) {
      setError(shippingErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add a note</DialogTitle>
          <DialogDescription>Internal by default — flag it as customer-visible if this platform later shows it to the customer.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea label="Note" placeholder="e.g. Left with building security, ask for receipt on delivery." maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        <Checkbox label="Customer-visible" checked={isCustomerVisible} onCheckedChange={(v) => setIsCustomerVisible(v === true)} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={addNoteMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} loading={addNoteMutation.isPending}>
            Add note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
