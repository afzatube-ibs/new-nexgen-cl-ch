import { Plus, Pencil, Archive, ArchiveRestore, Trash2, Building2, TrendingUp, TrendingDown, Lock, LockOpen } from 'lucide-react';
import type { InventoryAuditLogDTO } from '@nexgen/api-client';
import type { StockAdjustedDetails } from './activityFormat.js';

const WAREHOUSE_ACTION_ICON: Record<string, typeof Plus> = {
  'warehouse.created': Plus,
  'warehouse.updated': Pencil,
  'warehouse.archived': Archive,
  'warehouse.restored': ArchiveRestore,
  'warehouse.deleted': Trash2,
};

const RESERVATION_ACTION_ICON: Record<string, { icon: typeof Lock; className: string }> = {
  'stock.reserved': { icon: Lock, className: 'bg-feedback-info/10 text-feedback-info' },
  'stock.released': { icon: LockOpen, className: 'bg-surface-subtle text-text-secondary' },
};

export interface ActivityEntryIconProps {
  entry: InventoryAuditLogDTO;
  stockDetails: StockAdjustedDetails | null;
}

/** One glance says "stock moved up/down" vs. "a hold changed" vs. "a warehouse changed" — icon plus color, per DESIGN_SYSTEM.md §5's "color is never the only signal" (the action's own humanized label sits right next to this). Icon-only circles, not text, so the caption-size contrast issue `StockHealthBadge`/`DeltaBadge`/`ReservationStatusBadge` found doesn't apply here — axe's color-contrast rule only measures text. */
export function ActivityEntryIcon({ entry, stockDetails }: ActivityEntryIconProps) {
  if (stockDetails) {
    const positive = stockDetails.delta >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;
    return (
      <div
        className={
          'flex size-8 shrink-0 items-center justify-center rounded-full ' +
          (positive ? 'bg-feedback-success/10 text-feedback-success' : 'bg-feedback-danger/10 text-feedback-danger')
        }
      >
        <Icon className="size-4" aria-hidden="true" />
      </div>
    );
  }

  const reservationIcon = RESERVATION_ACTION_ICON[entry.action];
  if (reservationIcon) {
    const Icon = reservationIcon.icon;
    return (
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${reservationIcon.className}`}>
        <Icon className="size-4" aria-hidden="true" />
      </div>
    );
  }

  const Icon = WAREHOUSE_ACTION_ICON[entry.action] ?? Building2;
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-secondary">
      <Icon className="size-4" aria-hidden="true" />
    </div>
  );
}
