import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, Text } from '@nexgen/ui';
import { ConfirmDialog } from './ConfirmDialog.js';

export interface BulkAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'secondary' | 'destructive';
  /**
   * When set, the action no longer fires directly from the button click —
   * it opens this confirmation first. Found missing (PO acceptance audit,
   * Phase 2.2) on every module's bulk "Delete": a single click permanently
   * deleted the entire current selection with no confirmation step at all,
   * unlike every row-level Delete (which already goes through
   * `ConfirmDialog`). Required for any bulk action that is destructive
   * and irreversible — not just Delete, if a future caller adds one.
   */
  confirm?: { title: string; description: string; confirmLabel?: string };
}

export interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
}

/** Shared Framework — appears once a DataTable selection is non-empty (Phase 2.1 §6's Bulk Actions). Each module supplies its own action list; this owns only the bar chrome and the selection-count/clear affordance. */
export function BulkActionsBar({ selectedCount, onClear, actions }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border border-brand/30 bg-brand/5 px-4 py-2.5">
      <Text variant="body-strong" className="text-brand">
        {selectedCount} selected
      </Text>
      <div className="flex flex-1 items-center gap-2">
        {actions.map((action) => {
          const buttonVariant = action.variant === 'destructive' ? 'destructive' : 'secondary';
          if (action.confirm) {
            return (
              <ConfirmDialog
                key={action.label}
                trigger={
                  <Button size="sm" variant={buttonVariant}>
                    {action.icon}
                    {action.label}
                  </Button>
                }
                title={action.confirm.title}
                description={action.confirm.description}
                confirmLabel={action.confirm.confirmLabel ?? action.label}
                destructive={action.variant === 'destructive'}
                onConfirm={action.onClick}
              />
            );
          }
          return (
            <Button key={action.label} size="sm" variant={buttonVariant} onClick={action.onClick}>
              {action.icon}
              {action.label}
            </Button>
          );
        })}
      </div>
      <button type="button" onClick={onClear} aria-label="Clear selection" className="text-text-secondary hover:text-text-primary">
        <X className="size-4" />
      </button>
    </div>
  );
}
