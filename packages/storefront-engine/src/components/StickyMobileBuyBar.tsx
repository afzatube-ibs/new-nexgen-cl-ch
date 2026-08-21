import { AddToCartButton } from '../cart/AddToCartButton.js';
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
        size="lg"
        className="shrink-0"
      />
    </div>
  );
}
