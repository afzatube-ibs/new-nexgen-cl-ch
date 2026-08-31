import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea, Alert, useToast } from '@nexgen/ui';
import type { ReviewDTO } from '@nexgen/api-client';
import { reviewsErrorMessage } from '../shared/errors.js';
import { useRespondToReview } from '../shared/queries.js';

export interface ReviewRespondDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewDTO;
}

/**
 * `RespondToReviewAction` — `body` required (`RespondToReviewRequest`).
 * Setting a response is not a status transition — it's legal on a review
 * in any status, and calling this again REPLACES the prior response
 * rather than stacking a thread (`RespondToReviewAction`'s own docblock),
 * so this dialog pre-fills the existing response when editing one.
 */
export function ReviewRespondDialog({ open, onOpenChange, review }: ReviewRespondDialogProps) {
  const { toast } = useToast();
  const respondMutation = useRespondToReview();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isEditing = review.merchantResponse !== null;

  useEffect(() => {
    if (open) {
      setBody(review.merchantResponse?.body ?? '');
      setError(null);
    }
  }, [open, review.merchantResponse]);

  async function handleConfirm(): Promise<void> {
    if (!body.trim()) {
      setError('A response body is required.');
      return;
    }
    setError(null);
    try {
      await respondMutation.mutateAsync({ id: review.id, input: { body: body.trim(), expectedVersion: review.version } });
      toast({ variant: 'success', title: isEditing ? 'Response updated' : 'Response posted' });
      onOpenChange(false);
    } catch (err) {
      setError(reviewsErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit your response' : 'Respond to this review'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'This replaces your existing response — customers see only the latest one.'
              : 'Your response is shown publicly beneath this review on the storefront.'}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Textarea label="Response" placeholder="Thank you for your feedback…" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={respondMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} loading={respondMutation.isPending}>
            {isEditing ? 'Save response' : 'Post response'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
