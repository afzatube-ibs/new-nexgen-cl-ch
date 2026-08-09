import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

/** DESIGN_SYSTEM.md §2 — Loading (spinner), inline variant. */
export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn('size-4 animate-spin text-text-secondary', className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** DESIGN_SYSTEM.md §2 — Loading (spinner), full-panel overlay variant (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §7's full-screen session-restore state uses this). */
export function LoadingOverlay({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-3 text-text-secondary">
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <p className="text-body">{label}</p>
    </div>
  );
}
