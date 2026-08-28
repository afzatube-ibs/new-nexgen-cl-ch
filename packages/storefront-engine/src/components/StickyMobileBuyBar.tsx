import { AddToCartButton } from '../cart/AddToCartButton.js';
import { BuyNowButton } from '../cart/BuyNowButton.js';
import { PriceBlock, type Money } from './PriceBlock.js';
import { StockBadge } from './StockBadge.js';

/**
 * Store Components library — Beta Milestone 2.5's own "Sticky mobile
 * bottom buy bar" build item. A real Server Component (no client state of
 * its own needed — `position: fixed` + Tailwind's own `lg:hidden` do all
 * the work) pinned to the viewport bottom on mobile only, keeping price
 * and a real "Add to cart" affordance in thumb reach while the rest of
 * the Product Detail page scrolls — the single highest-leverage, lowest-
 * risk mobile-conversion pattern every competitor researched for that
 * milestone (Amazon, Daraz, Shein, Temu) uses.
 *
 * **Beta Sprint 3 — Cart Engine**: "Add to cart" is now real
 * (`AddToCartButton`, itself a Client Component — the one interactive
 * leaf in this otherwise-Server component, same Server/Client split
 * reasoning as `ProductCard`'s own `ProductQuickActions`).
 *
 * **Experience Polish Sprint 1, Pack 5 (item 5.5)**: `BuyNowButton` (also
 * a Client Component, imported and rendered here the same way
 * `AddToCartButton` already is — a Server Component may render a Client
 * Component as a child with no boundary issue) now sits alongside it —
 * the audit's own highest-priority mobile gap, since mobile is where
 * shoppers spend the most PDP time and Buy Now previously existed only on
 * desktop. `AddToCartButton` renders `variant="icon"` here (a compact,
 * secondary affordance) so the labeled, primary `BuyNowButton` has room
 * to be the one dominant action in this space-constrained bar, per
 * `NEXGEN_STOREFRONT_DESIGN_DNA.md` §15 rule #3.
 */
export interface StickyMobileBuyBarProps {
  productId: string;
  name: string;
  href: string;
  imageSrc?: string | null;
  status: string;
  price?: Money | null;
  compareAtPrice?: Money | null;
}

export function StickyMobileBuyBar({ productId, name, href, imageSrc, status, price, compareAtPrice }: StickyMobileBuyBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-surface p-3 shadow-elevation-3 lg:hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <StockBadge status={status} className="mb-0.5 w-fit" />
        <PriceBlock price={price} compareAtPrice={compareAtPrice} />
      </div>
      <AddToCartButton
        productId={productId}
        name={name}
        href={href}
        imageSrc={imageSrc}
        unitPrice={price ? price.amountMinor / 100 : null}
        currencyCode={price?.currencyCode ?? null}
        disabled={status !== 'active'}
        disabledReason="Unavailable"
        variant="icon"
        className="shrink-0"
      />
      <BuyNowButton
        productId={productId}
        name={name}
        href={href}
        imageSrc={imageSrc}
        unitPrice={price ? price.amountMinor / 100 : null}
        currencyCode={price?.currencyCode ?? null}
        disabled={status !== 'active'}
        disabledReason="Unavailable"
        className="shrink-0"
      />
    </div>
  );
}
