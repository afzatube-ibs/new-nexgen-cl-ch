import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { ReturnRequestDTO } from '@nexgen/api-client';
import { returnsErrorMessage } from '../shared/errors.js';
import { useRejectReturnRequest } from '../shared/queries.js';

export interface ReturnRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnRequest: ReturnRequestDTO;
}

/**
 * `RejectReturnRequestAction` — `reason` is `required`
 * (`RejectReturnRequestRequest`), mirroring `ShipmentFailDialog`'s own
 * shape exactly for the identical reason. Reachable from `requested`/
 * `approved`/`pickup_scheduled`/`received`/`inspecting` (confirmed via
 * `ALLOWED_TRANSITIONS` directly) — the caller (`ReturnWorkflowActions`)
 * decides when to offer it; this dialog itself does not re-check status.
 */
export function ReturnRejectDialog({ open, onOpenChange, returnRequest }: ReturnRejectDialogProps) {
  const { toast } = useToast();
  const rejectMutation = useRejectReturnRequest();
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
      setError('A reason is required to reject a return request.');
      return;
    }
    setError(null);
    try {
      await rejectMutation.mutateAsync({ id: returnRequest.id, input: { reason: reason.trim(), expectedVersion: returnRequest.version } });
      toast({ variant: 'success', title: 'Return request rejected' });
      onOpenChange(false);
    } catch (err) {
      setError(returnsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Reject this return request?</DialogTitle>
          <DialogDescription>
            This is a final state for this return request. State a reason — it&rsquo;s recorded on this request&rsquo;s timeline and audit log, and customer-facing surfaces may show it.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea
          label="Reason"
          placeholder="e.g. Item is outside the return window, no proof of damage provided…"
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={rejectMutation.isPending}>
            Keep request
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} loading={rejectMutation.isPending}>
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
