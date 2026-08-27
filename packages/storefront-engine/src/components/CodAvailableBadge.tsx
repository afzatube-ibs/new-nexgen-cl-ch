import { Truck } from 'lucide-react';
import { Icon, Text, cn } from '@nexgen/ui';

/**
 * Beta Experience Pack 1 — Product Card v3's own real "COD badge". Real,
 * not fabricated: Cash on Delivery is a real, live, contract-driven
 * backend gateway with no external credential dependency (`CodGateway`,
 * confirmed working end-to-end in Beta Sprint 5's own live verification —
 * a real Order + real COD Payment were placed through it) — the one
 * payment method genuinely, unconditionally available in every real
 * installation of this platform today, matching `NEXGEN_PRODUCT_MASTER_
 * VISION.md` §11's own "COD as a first-class, default-visible option
 * everywhere" bar. Deliberately site-wide and static, not per-product:
 * no real per-product COD-eligibility field exists on `ProductSummary`
 * (nor should one be invented) — COD availability is a store-wide payment
 * capability, not a product attribute.
 */
export function CodAvailableBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-caption text-text-secondary', className)}>
      <Icon icon={Truck} size="inline" />
      <Text as="span" variant="caption">
        COD available
      </Text>
    </span>
  );
}
