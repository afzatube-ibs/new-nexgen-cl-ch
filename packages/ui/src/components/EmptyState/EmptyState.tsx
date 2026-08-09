import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '../Button/Button.js';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

/** DESIGN_SYSTEM.md §2 — Empty State: illustration slot, title, description, optional primary action. Used whenever real data is absent — never a fake/placeholder row (Phase 2.1's own Dashboard requirement). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-12 text-center">
      <div className="text-text-secondary">{icon ?? <Inbox className="size-8" aria-hidden="true" />}</div>
      <p className="text-body-strong text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-body text-text-secondary">{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
