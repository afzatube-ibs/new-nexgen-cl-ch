import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Text, Badge } from '@nexgen/ui';
import type { BulkOperationState } from './useBulkOperation.js';

export interface BulkOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  state: BulkOperationState;
  onCancel: () => void;
  onRetryFailed: () => void;
}

/**
 * The bulk orchestration layer's own progress UI (Phase 2.2 §2): a progress
 * bar while running, Cancel while running, and — once done or cancelled —
 * success/failure counts, a per-item failure list, and "Retry failed (N)".
 * Composes only `@nexgen/ui` primitives; no new design-system component was
 * added for the progress bar itself (kept local to this one dialog rather
 * than expanding the shared component inventory for a single caller).
 */
export function BulkOperationDialog({ open, onOpenChange, title, state, onCancel, onRetryFailed }: BulkOperationDialogProps) {
  const { status, total, completed, results } = state;
  const failed = results.filter((r) => r.status === 'error');
  const succeeded = results.filter((r) => r.status === 'success');
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const running = status === 'running';

  return (
    <Dialog open={open} onOpenChange={(next) => (running ? undefined : onOpenChange(next))}>
      <DialogContent size="md" showCloseButton={!running}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {running
              ? `Processing ${completed} of ${total}…`
              : `${succeeded.length} succeeded, ${failed.length} failed of ${total} total.`}
          </DialogDescription>
        </DialogHeader>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={title}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        {!running && failed.length > 0 && (
          <div className="mt-4 max-h-56 overflow-auto rounded-md border border-border">
            {failed.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
                <div>
                  <Text variant="body-strong">{item.label}</Text>
                  <Text variant="caption" className="text-feedback-danger">
                    {item.error}
                  </Text>
                </div>
                <Badge variant="danger">Failed</Badge>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          {running ? (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <>
              {failed.length > 0 && (
                <Button variant="secondary" onClick={onRetryFailed}>
                  Retry failed ({failed.length})
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
