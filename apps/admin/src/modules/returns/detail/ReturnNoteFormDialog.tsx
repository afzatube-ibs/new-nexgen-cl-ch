import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Checkbox, Alert, useToast } from '@nexgen/ui';
import type { ReturnRequestDTO } from '@nexgen/api-client';
import { returnsErrorMessage } from '../shared/errors.js';
import { useAddReturnNote } from '../shared/queries.js';

export interface ReturnNoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnRequest: ReturnRequestDTO;
}

/**
 * `ReturnNoteController::store` — `returns.requests.manage`, append-only,
 * no status guard (mirrors `ShipmentNoteFormDialog`'s own shape exactly,
 * including the same honest `isCustomerVisible` treatment: tracked, but no
 * customer-facing surface in this platform reads it yet).
 */
export function ReturnNoteFormDialog({ open, onOpenChange, returnRequest }: ReturnNoteFormDialogProps) {
  const { toast } = useToast();
  const addNoteMutation = useAddReturnNote();
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
      await addNoteMutation.mutateAsync({ id: returnRequest.id, input: { body: body.trim(), isCustomerVisible } });
      toast({ variant: 'success', title: 'Note added' });
      onOpenChange(false);
    } catch (err) {
      setError(returnsErrorMessage(err));
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
        <Textarea label="Note" placeholder="e.g. Customer confirmed item condition over the phone." maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
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
