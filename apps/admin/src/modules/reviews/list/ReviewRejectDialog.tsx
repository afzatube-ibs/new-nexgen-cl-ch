import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { ReviewDTO } from '@nexgen/api-client';
import { reviewsErrorMessage } from '../shared/errors.js';
import { useRejectReview } from '../shared/queries.js';

export interface ReviewRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewDTO;
}

/**
 * `RejectReviewAction` — `reason` is `required` (`RejectReviewRequest`),
 * mirrors `ReturnRejectDialog`'s own shape exactly. Moderation is genuinely
 * bidirectional (`Review::TRANSITIONS`) — an already-approved review can
 * also be reported and rejected later, not only a pending one; this dialog
 * itself never checks `review.status`.
 */
export function ReviewRejectDialog({ open, onOpenChange, review }: ReviewRejectDialogProps) {
  const { toast } = useToast();
  const rejectMutation = useRejectReview();
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
      setError('A reason is required to reject a review.');
      return;
    }
    setError(null);
    try {
      await rejectMutation.mutateAsync({ id: review.id, input: { reason: reason.trim(), expectedVersion: review.version } });
      toast({ variant: 'success', title: 'Review rejected' });
      onOpenChange(false);
    } catch (err) {
      setError(reviewsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Reject this review?</DialogTitle>
          <DialogDescription>
            The review will no longer appear on the storefront. State a reason — it&rsquo;s recorded on this review&rsquo;s audit log.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea
          label="Reason"
          placeholder="e.g. Contains promotional spam, off-topic content, abusive language…"
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={rejectMutation.isPending}>
            Keep review
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} loading={rejectMutation.isPending}>
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
