import type { ReactNode } from 'react';
import { cn } from '@nexgen/ui';

/**
 * Store Components library — Experience Polish Sprint 1, Pack 2 (Product
 * Card v4). A real, ordered, extensible badge region — not a duplicate of
 * `Badge`/`StockBadge`/`CodAvailableBadge`, a thin layout+policy wrapper
 * around them (`EXPERIENCE_POLISH_SPRINT_1_IMPLEMENTATION_ROADMAP.md`
 * Pack 2, item 2.1; `NEXGEN_STOREFRONT_DESIGN_DNA.md` §7's own "composition
 * over proliferation" rule).
 *
 * Today this slot holds exactly one real badge (`StockBadge`, via
 * `ProductCard`'s own corner overlay) — the same single badge that
 * rendered here before this component existed. Its entire purpose is
 * architectural: the day a real per-product signal exists (a real
 * discount once a Gateway pricing route lands, a real "New" flag, a real
 * low-stock count once Inventory is composed to the Storefront), it is
 * added to the `badges` array at the call site — never a second corner
 * overlay, never a positioning refactor, never a new component. No
 * fabricated badge is ever added here to fill the slot in the meantime,
 * per `NEXGEN_STOREFRONT_DESIGN_DNA.md` §0's anti-fabrication refusal.
 *
 * `maxVisible` caps real clutter risk once multiple real badges exist
 * simultaneously — `NEXGEN_STOREFRONT_DESIGN_DNA.md` §2's own decision-
 * fatigue principle applied to a dense grid card specifically, where
 * screen space is the tightest of any surface on the storefront.
 */
export interface ProductBadgeSlotItem {
  /** A stable key, distinct from the badge's own display content — lets a caller reorder or replace one badge without remounting the others. */
  id: string;
  node: ReactNode;
}

export interface ProductBadgeSlotProps {
  badges: ProductBadgeSlotItem[];
  /** Real badges shown before the rest are silently dropped, not overflowed or wrapped — a dense grid card has no room for a fourth line of badges. Default 3. */
  maxVisible?: number;
  className?: string;
}

export function ProductBadgeSlot({ badges, maxVisible = 3, className }: ProductBadgeSlotProps) {
  const visible = badges.slice(0, maxVisible);
  if (visible.length === 0) return null;

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      {visible.map((badge) => (
        <div key={badge.id}>{badge.node}</div>
      ))}
    </div>
  );
}
