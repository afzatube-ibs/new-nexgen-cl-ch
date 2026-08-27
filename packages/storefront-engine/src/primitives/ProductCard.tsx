import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@nexgen/ui';
import { AddToCartButton } from '../cart/AddToCartButton.js';
import { CodAvailableBadge } from '../components/CodAvailableBadge.js';
import { PriceBlock } from '../components/PriceBlock.js';
import { ProductBadgeSlot } from '../components/ProductBadgeSlot.js';
import { ProductQuickActions } from '../components/ProductQuickActions.js';
import { StockBadge } from '../components/StockBadge.js';
import type { ProductCardProps } from './types.js';

/**
 * `STOREFRONT_COMPONENT_ENGINE.md` §2's `ProductCard` primitive — v4
 * (Experience Polish Sprint 1, Pack 2), on top of Beta Experience Pack 1's
 * own v3 rebuild. Still a real Server Component for everything that
 * doesn't need client state (image, link, price, stock) —
 * `ProductQuickActions` (a real Client Component) is the one interactive
 * subtree, split out for the same Server/Client boundary reason
 * `StoreHeader.tsx`'s own docblock documents.
 *
 * **v4's own real additions**, per
 * `EXPERIENCE_POLISH_SPRINT_1_IMPLEMENTATION_ROADMAP.md` Pack 2 and
 * `NEXGEN_STOREFRONT_DESIGN_DNA.md`:
 * - The corner overlay is now `ProductBadgeSlot` (item 2.1) — an ordered,
 *   capped, extensible region, not a single hardcoded `<StockBadge />`.
 *   It renders exactly the same one real badge as before; the only change
 *   is that a future real per-product signal (a real discount once
 *   pricing exists, a real "New"/low-stock flag) is added to its
 *   `badges` array at this one call site, never a second overlay.
 * - A sharper, more tactile visual identity (item 2.2) — a larger corner
 *   radius and a real hover lift (transform + shadow together, not
 *   shadow alone) so the card reads as a shopping surface, not an Admin
 *   data-table row wearing product data (`NEXGEN_STOREFRONT_DESIGN_DNA.md`
 *   §4's "premium" and "modern" personality traits).
 *
 * **Deliberately not added this pass** (honestly, not silently): a
 * rating/review-count row (no Reviews backend — out of scope), a
 * delivery-estimate badge, a campaign/bundle badge, and a countdown (none
 * has a real per-product data source — inventing one would be exactly the
 * fabrication `NEXGEN_STOREFRONT_DESIGN_DNA.md` §0 forbids); a second/hover
 * product image (`ProductSummary` still carries exactly one image field);
 * and a per-card "Buy Now"/WhatsApp CTA (that stays the Product Detail
 * page's own Buy Box, per that page's own v3 docblock).
 *
 * A field-by-field accounting of the v2 brief's own checklist, against
 * what the real Gateway `ProductSummary` actually carries — every gap
 * named here is also named in `MERCHANT_CONVERSION_AUDIT.md`, never
 * silently dropped:
 * - Image ✅. **Secondary/hover image** ❌ — `ProductSummary` has exactly
 *   one image field; a real hover-zoom substitutes honestly.
 * - **Product video** ❌ — no video field/backend exists.
 * - Badges: only `status`-derived (`StockBadge`) is real, rendered through
 *   `ProductBadgeSlot`. New/Hot/Trending/Flash Sale/Limited Stock/
 *   Imported/Warranty have no real backing signal — not rendered (see
 *   audit for the real fields each would need).
 * - **Discount / Saving amount** ✅ real, via `PriceBlock` — computed only
 *   when a real `compareAtPrice` is present (never today — no Gateway
 *   pricing route exists yet).
 * - Delivery badge ❌ no per-product or site-wide delivery-policy data
 *   source exists yet (Checkout/Shipping composition, not built).
 * - Brand ✅ (page-resolved). Category — intentionally omitted, same
 *   reasoning as v1.
 * - Rating ❌ — no reviews backend; no empty star row (would imply "0
 *   stars," a fabricated signal).
 * - **Recently viewed** — not a `ProductCard` concern; see
 *   `RecentlyViewedRail.tsx`.
 * - **Quick Add** ✅ real and fully functional as of Beta Sprint 3's Cart
 *   Engine — adds a real line to the real `localStorage` cart
 *   (`cart/cartStore.ts`), opens the Cart Drawer, disabled with an honest
 *   reason when `status !== 'active'`. **Quick View** ✅ real and fully
 *   functional (`QuickViewModal.tsx`). Wishlist/Compare ✅ real, honestly
 *   inert (no Wishlist/Compare backend exists yet).
 * - Skeleton loading: `ProductCardSkeleton` below, dimensionally matched
 *   to this v4 card's own new corner radius.
 */
export function ProductCard({ product, href, brandName, price, compareAtPrice }: ProductCardProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface',
        'transition-all duration-fast hover:-translate-y-0.5 hover:shadow-elevation-2',
      )}
    >
      <Link
        href={href}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-t-xl"
        aria-label={product.name}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-surface-subtle">
          {product.image ? (
            <Image
              src={product.image.src}
              alt={product.image.alt || product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-slow group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-caption text-text-secondary">No image</div>
          )}
          <ProductBadgeSlot badges={[{ id: 'stock', node: <StockBadge status={product.status} /> }]} className="absolute left-2 top-2" />

          {/* Quick Add — Beta Sprint 3's own Cart Engine: a real, working add-to-cart, wired to the real localStorage cart (`cart/cartStore.ts`). Disabled, with an honest reason, when `product.status !== 'active'`. */}
          <AddToCartButton
            variant="bar"
            productId={product.id}
            sku={null}
            name={product.name}
            href={href}
            imageSrc={product.image?.src ?? null}
            unitPrice={price ? price.amountMinor / 100 : null}
            currencyCode={price?.currencyCode ?? null}
            disabled={product.status !== 'active'}
            disabledReason="Unavailable"
            className={cn(
              'absolute inset-x-0 bottom-0 translate-y-full bg-brand py-2 text-center text-caption font-medium text-white',
              'transition-transform duration-fast group-hover:translate-y-0 group-focus-within:translate-y-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
              'disabled:cursor-not-allowed disabled:opacity-70',
            )}
          />
        </div>
      </Link>

      <ProductQuickActions
        product={product}
        href={href}
        brandName={brandName}
        price={price}
        compareAtPrice={compareAtPrice}
        className="pointer-events-none absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100"
      />

      <Link href={href} className="flex flex-1 flex-col gap-1.5 p-3 focus-visible:outline-none">
        {brandName && <p className="text-caption uppercase tracking-wide text-text-secondary">{brandName}</p>}
        <p className="line-clamp-2 text-body-strong text-text-primary">{product.name}</p>
        <PriceBlock price={price} compareAtPrice={compareAtPrice} className="mt-auto pt-1" />
        <CodAvailableBadge />
      </Link>
    </div>
  );
}

/** A real skeleton, dimensionally matched to the card above — this milestone's own "Skeleton loading" build item, used while `ProductGrid`'s own data is streaming in behind a `<Suspense>` boundary. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface" aria-hidden="true">
      <div className="aspect-square w-full animate-pulse bg-surface-subtle" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-16 animate-pulse rounded bg-surface-subtle" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-subtle" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-subtle" />
        <div className="h-5 w-20 animate-pulse rounded bg-surface-subtle" />
      </div>
    </div>
  );
}
