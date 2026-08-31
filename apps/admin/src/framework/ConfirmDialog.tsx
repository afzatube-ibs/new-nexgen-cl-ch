import { useState, type ReactNode } from 'react';
import { Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Alert } from '@nexgen/ui';

export interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  /**
   * Maps a thrown error to merchant-facing text. Defaults to a generic
   * fallback — pass a domain-aware mapper (e.g. Catalog's own
   * `catalogErrorMessage`) wherever the caller can give a more specific
   * answer than "something went wrong" (a 409 dependent-records-exist
   * block, in particular, has a real, actionable reason worth showing).
   */
  getErrorMessage?: (error: unknown) => string;
}

/**
 * Shared Framework — the standard delete/destructive-action confirmation,
 * so no module hand-rolls its own `window.confirm()` or ad hoc dialog.
 *
 * `handleConfirm` used to `try { await onConfirm() } finally { ... }` with
 * no `catch` at all — a rejection (e.g. the real 409 a merchant gets when
 * deleting a taxonomy entry still assigned to a product) propagated out of
 * a `void`-called handler as an unhandled promise rejection: the dialog
 * silently sat there with the button reset and no explanation, which is
 * exactly the "silent" failure mode this component exists to prevent.
 * Found via a Product Owner acceptance audit of Phase 2.2 (2026-08-11),
 * while adding the first *common, expected* case that fails this way
 * (blocking delete-while-in-use). Now caught, shown, and the dialog stays
 * open so the merchant can act on it (Cancel, or fix the underlying issue
 * and retry).
 *
 * Footer buttons `stopPropagation()` on click — `DialogContent` renders
 * via a React portal, and React re-dispatches synthetic events by walking
 * the *component* tree, not the DOM tree, so a click here still bubbles
 * past the portal boundary to whatever the `trigger` sits inside. Found
 * live-verifying Milestone 16 (Notifications Admin UI, 2026-09-01):
 * confirming "Cancel notification" from a `DataTable` row (`trigger`
 * itself already stops its own click, but that doesn't stop *this*
 * button's separate click) bubbled to the row's `onRowClick` and
 * force-navigated to the detail page right after the confirm succeeded.
 * Since every module's destructive list-row action goes through this one
 * component, the fix belongs here rather than in each list page.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
  getErrorMessage,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage ? getErrorMessage(err) : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={(event) => {
              event.stopPropagation();
              void handleConfirm();
            }}
            loading={submitting}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
