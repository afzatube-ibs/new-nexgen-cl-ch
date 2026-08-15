import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Checkbox, Alert, useToast } from '@nexgen/ui';
import type { OrderDTO } from '@nexgen/api-client';
import { ordersErrorMessage } from '../shared/errors.js';
import { useAddOrderNote } from '../shared/queries.js';

export interface OrderNoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDTO;
}

/**
 * `AddOrderNoteAction` — append-only, `orders.notes.manage`. No edit/
 * delete UI exists here because no such endpoint exists on the backend
 * (`OrderNote::UPDATED_AT = null`, confirmed by reading the model
 * directly). `isCustomerVisible` is tracked and shown honestly as
 * internal-only today — no customer-facing surface reads it yet (see
 * `PHASE_2_6_ORDERS_ARCHITECTURE.md` §6.3).
 */
export function OrderNoteFormDialog({ open, onOpenChange, order }: OrderNoteFormDialogProps) {
  const { toast } = useToast();
  const addNoteMutation = useAddOrderNote(order.id);
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
      await addNoteMutation.mutateAsync({ body: body.trim(), isCustomerVisible, expectedVersion: order.version });
      toast({ variant: 'success', title: 'Note added' });
      onOpenChange(false);
    } catch (err) {
      setError(ordersErrorMessage(err));
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
        <Textarea label="Note" placeholder="e.g. Called customer to confirm delivery window." maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
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
