import { Badge } from '@nexgen/ui';

/**
 * Catalog status is not inventory availability. The Storefront currently
 * receives `draft | active | archived` from Catalog but no composed
 * quantity-on-hand signal from Inventory. Showing "In Stock" for `active`
 * therefore overstates what we know.
 *
 * Until a real Catalog↔Inventory availability field is exposed through the
 * Gateway, active products render no stock claim. Non-active products may
 * still render an explicit unavailable state.
 */
export interface StockBadgeProps {
  status: string;
  className?: string;
}

export function StockBadge({ status, className }: StockBadgeProps) {
  if (status === 'active') return null;

  return (
    <Badge variant="outline" className={className}>
      Unavailable
    </Badge>
  );
}
