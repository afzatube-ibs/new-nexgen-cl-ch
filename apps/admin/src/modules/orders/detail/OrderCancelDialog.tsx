import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { OrderDTO } from '@nexgen/api-client';
import { ordersErrorMessage } from '../shared/errors.js';
import { useCancelOrder } from '../shared/queries.js';

export interface OrderCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDTO;
}

/**
 * `CancelOrderAction` requires a stated `reason` (`max:1000`) — the one
 * transition an operator or customer needs to justify, per that Action's
 * own docblock — so this is a dedicated small dialog rather than the plain
 * `ConfirmDialog` every other transition uses.
 */
export function OrderCancelDialog({ open, onOpenChange, order }: OrderCancelDialogProps) {
  const { toast } = useToast();
  const cancelMutation = useCancelOrder();
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
      setError('A reason is required to cancel an order.');
      return;
    }
    setError(null);
    try {
      await cancelMutation.mutateAsync({ id: order.id, input: { reason: reason.trim(), expectedVersion: order.version } });
      toast({ variant: 'success', title: 'Order cancelled' });
      onOpenChange(false);
    } catch (err) {
      setError(ordersErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Cancel order {order.orderNumber}?</DialogTitle>
          <DialogDescription>This order will move to Cancelled, a final state. State a reason — it&rsquo;s recorded on the order&rsquo;s timeline and audit log.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea
          label="Reason"
          placeholder="e.g. Customer requested cancellation, out of stock…"
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={cancelMutation.isPending}>
            Keep order
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} loading={cancelMutation.isPending}>
            Cancel order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
