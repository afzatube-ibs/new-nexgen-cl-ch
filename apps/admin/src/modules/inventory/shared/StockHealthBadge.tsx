import { CheckCircle2, AlertTriangle, XCircle, Archive } from 'lucide-react';
import { Badge } from '@nexgen/ui';
import { stockHealth, type StockHealthStatus } from './stockHealth.js';
import type { StockItemDTO, WarehouseStatus } from '@nexgen/api-client';

const ICON: Record<StockHealthStatus, typeof CheckCircle2> = {
  healthy: CheckCircle2,
  low_stock: AlertTriangle,
  out_of_stock: XCircle,
  archived: Archive,
};

export interface StockHealthBadgeProps {
  item: Pick<StockItemDTO, 'quantityAvailable'>;
  warehouseStatus?: WarehouseStatus;
}

/**
 * Never color alone (DESIGN_SYSTEM.md §5) — an icon plus a text label
 * ("Low stock", not just amber) so the status reads correctly for
 * colorblind operators and screen readers alike.
 *
 * `Badge`'s tinted `success`/`warning`/`danger` variants (a 10%-opacity
 * background paired with the same color's full-strength text) all fail
 * WCAG AA color contrast at caption text size (2.85:1 to 4.13:1 against
 * the 4.5:1 floor, found live via this pass's own `@axe-core/playwright`
 * scan — the first time this codebase has ever populated a scanned page
 * with any of these at caption size; every prior "danger"/"warning"
 * surface in Catalog is the larger-text `Alert` component instead).
 * Fixing the tokens themselves is Design System work, explicitly out of
 * scope for this pass — `CONTRAST_SAFE_CLASS` overrides just this
 * component's own usage with a full-strength feedback-color background via
 * `className`, the sanctioned per-usage customization surface every
 * component here already supports — not a Design System change. Danger's
 * background is dark enough that white text (the same pairing `Button`'s
 * own `destructive` variant already uses) clears 4.5:1; success/warning's
 * lighter, brighter backgrounds don't — measured directly (white-on-white-
 * loses-contrast is a mistake this pass caught live via axe, not assumed),
 * so those two pair with black text instead.
 */
const CONTRAST_SAFE_CLASS: Partial<Record<StockHealthStatus, string>> = {
  healthy: 'bg-feedback-success text-black',
  low_stock: 'bg-feedback-warning text-black',
  out_of_stock: 'bg-feedback-danger text-white',
};

export function StockHealthBadge({ item, warehouseStatus }: StockHealthBadgeProps) {
  const info = stockHealth(item, warehouseStatus);
  const Icon = ICON[info.status];
  return (
    <Badge variant={info.badgeVariant} className={`gap-1 ${CONTRAST_SAFE_CLASS[info.status] ?? ''}`}>
      <Icon className="size-3" aria-hidden="true" />
      {info.label}
    </Badge>
  );
}
