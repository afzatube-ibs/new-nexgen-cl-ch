import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button/Button.js';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/** DESIGN_SYSTEM.md §2 — Error State: retry action; distinct from a form field's inline validation error (that's Input/Textarea/Select's own `error` prop). */
export function ErrorState({
  title = 'Something went wrong',
  description = 'This content could not be loaded. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-feedback-danger/30 bg-feedback-danger/5 p-8 text-center">
      <AlertTriangle className="size-8 text-feedback-danger" aria-hidden="true" />
      <p className="text-body-strong text-text-primary">{title}</p>
      <p className="max-w-sm text-body text-text-secondary">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
