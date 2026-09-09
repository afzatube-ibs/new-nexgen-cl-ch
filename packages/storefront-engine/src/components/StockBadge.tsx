import { Badge } from '@nexgen/ui';

/**
 * Customer-facing stock state. Catalog publish status still controls whether
 * a product may be sold at all; `isAvailable` comes only from the real
 * Inventory composition. Unknown Inventory state renders no stock claim.
 */
export interface StockBadgeProps {
  status: string;
  isAvailable: boolean | null;
  className?: string;
}

export function StockBadge({ status, isAvailable, className }: StockBadgeProps) {
  if (status !== 'active') {
    return (
      <Badge variant="outline" className={className}>
        Unavailable
      </Badge>
    );
  }

  if (isAvailable === true) {
    return (
      <Badge variant="success" className={className}>
        In Stock
      </Badge>
    );
  }

  if (isAvailable === false) {
    return (
      <Badge variant="outline" className={className}>
        Out of stock
      </Badge>
    );
  }

  return null;
}
