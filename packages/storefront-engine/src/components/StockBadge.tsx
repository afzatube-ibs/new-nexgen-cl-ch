import { Badge } from '@nexgen/ui';

/**
 * Shopper-facing stock truth. Catalog status remains a publish/lifecycle
 * signal; Inventory's composed tri-state is the only source allowed to
 * produce an in/out-of-stock claim.
 *
 * `isAvailable === null | undefined` means availability could not be
 * resolved, so active products render no stock claim rather than guessing.
 */
export interface StockBadgeProps {
  status: string;
  isAvailable?: boolean | null;
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

  if (isAvailable === null || isAvailable === undefined) return null;

  if (!isAvailable) {
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
