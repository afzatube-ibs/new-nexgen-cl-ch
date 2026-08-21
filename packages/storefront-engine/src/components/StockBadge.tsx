import { Badge } from '@nexgen/ui';

/**
 * Store Components library — availability badge, derived ONLY from the
 * real `ProductSummary.status` field the Gateway already returns
 * (`draft | active | archived` — the Catalog module's own publish state).
 *
 * **A real, documented gap**: this is a publish-state signal, not true
 * per-warehouse stock-on-hand. The Inventory module (`apps/admin`'s own
 * Stock Levels screen) has real quantity/reservation data, but the Store
 * API Gateway has no public Catalog↔Inventory composition yet — no route
 * exists for the Storefront to ask "how many units of SKU X are
 * available." "Low stock" (a specific real remaining-quantity threshold)
 * and a true SKU-level "Out of stock" (quantity = 0, distinct from
 * `status: archived`) are therefore NOT rendered here — fabricating
 * either from data this component doesn't have would violate this
 * engagement's own anti-fabrication rule. Named as a top gap in
 * `MISSING_ECOMMERCE_FEATURES_AUDIT.md`.
 */
export interface StockBadgeProps {
  status: string;
  className?: string;
}

export function StockBadge({ status, className }: StockBadgeProps) {
  if (status === 'active') {
    return (
      <Badge variant="success" className={className}>
        In Stock
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={className}>
      Unavailable
    </Badge>
  );
}
