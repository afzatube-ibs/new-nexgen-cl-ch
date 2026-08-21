'use client';

import { useState } from 'react';
import { Icon } from '@nexgen/ui';
import { Eye, GitCompareArrows, Heart } from 'lucide-react';
import { QuickViewModal } from './QuickViewModal.js';
import { recordRecentlyViewed } from './recentlyViewed.js';
import type { Money } from './PriceBlock.js';
import type { ProductSummary } from '../gateway/types.js';

/**
 * Store Components library — the real, client-side half of `ProductCard`
 * v2's quick-action row. Split out from `ProductCard` itself (a Server
 * Component) because opening `QuickViewModal` needs real client state —
 * the same Server/Client boundary discipline `StoreHeader.tsx`'s own
 * docblock documents. Wishlist and Compare stay honestly inert (no
 * backend); Quick View is real and fully functional (`QuickViewModal.tsx`'s
 * own docblock) and records the product into the real `localStorage`
 * Recently Viewed history on open, since previewing a product's own real
 * detail is a genuine "view" event.
 */
export interface ProductQuickActionsProps {
  product: ProductSummary;
  href: string;
  brandName?: string | null;
  price?: Money | null;
  compareAtPrice?: Money | null;
  className?: string;
}

export function ProductQuickActions({ product, href, brandName, price, compareAtPrice, className }: ProductQuickActionsProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  function openQuickView() {
    recordRecentlyViewed({ id: product.id, name: product.name, href, imageSrc: product.image?.src ?? null });
    setQuickViewOpen(true);
  }

  return (
    <>
      <div className={className}>
        <button
          type="button"
          aria-label={`Add ${product.name} to wishlist — coming soon`}
          title="Coming soon"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-primary shadow-elevation-1 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Icon icon={Heart} size="inline" />
        </button>
        <button
          type="button"
          aria-label={`Quick view ${product.name}`}
          onClick={openQuickView}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-primary shadow-elevation-1 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Icon icon={Eye} size="inline" />
        </button>
        <button
          type="button"
          aria-label={`Compare ${product.name} — coming soon`}
          title="Coming soon"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-primary shadow-elevation-1 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Icon icon={GitCompareArrows} size="inline" />
        </button>
      </div>
      <QuickViewModal product={quickViewOpen ? product : null} href={href} brandName={brandName} price={price} compareAtPrice={compareAtPrice} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
    </>
  );
}
