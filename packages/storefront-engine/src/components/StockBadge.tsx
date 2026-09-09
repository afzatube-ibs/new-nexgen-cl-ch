import { Badge } from '@nexgen/ui';

/**
 * Shopper-facing stock truth. Catalog status remains a publish/lifecycle
 * signal; Inventory's aggregate quantity is the only source allowed to
 * produce an in/out-of-stock claim.
 *
 * `totalAvailable === null | undefined` means availability could not be
 * resolved, so active products render no stock claim rather than guessing.
 */
export interface StockBadgeProps {
  status: string;
  totalAvailable?: number | null;
  className?: string;
}

export function StockBadge({ status, totalAvailable, className }: StockBadgeProps) {
  if (status !== 'active') {
    return (
      <Badge variant="outline" className={className}>
        Unavailable
      </Badge>
    );
  }

  if (totalAvailable === null || totalAvailable === undefined) return null;

  if (totalAvailable <= 0) {
    return (
      <Badge variant="outline" className={className}>
        Out of stock
      </Badge>
    );
  }

  return (
    <Badge variant="success" className={className}>
      In stock
    </Badge>
  );
}
