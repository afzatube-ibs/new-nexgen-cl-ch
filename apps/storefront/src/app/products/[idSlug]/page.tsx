import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PackageSearch, ShieldCheck, Truck as TruckIcon } from 'lucide-react';
import {
  Breadcrumb,
  CodAvailableBadge,
  CourierBadge,
  GatewayRequestError,
  PaymentMethodsRow,
  PriceBlock,
  ProductGallery,
  ProductGrid,
  QASection,
  RatingSummary,
  REAL_BACKEND_PAYMENT_METHODS,
  RecentlyViewedRail,
  ReviewList,
  SectionHeader,
  ShippingCalculator,
  StickyMobileBuyBar,
  StockBadge,
  TrustBadge,
  buildBreadcrumbSchema,
  buildProductSchema,
  extractIdFromSegment,
  getBrand,
  getProduct,
  getRecommendations,
  type CourierId,
} from '@nexgen/storefront-engine';
import { AddToCartButton, BuyNowButton } from '@nexgen/storefront-engine/client';
import { Badge, Text } from '@nexgen/ui';
import { ShareButton } from '@/components/ShareButton';
import { ViewTracker } from '@/components/ViewTracker';
import { categoryHref, productHref } from '@/lib/hrefs';

const REAL_COURIERS: CourierId[] = ['pathao', 'steadfast', 'redx', 'paperfly', 'sundarban'];

interface PageProps {
  params: Promise<{ idSlug: string }>;
}

async function loadProduct(idSlug: string) {
  const id = extractIdFromSegment(idSlug);
  try {
    return await getProduct(id);
  } catch (error) {
    if (error instanceof GatewayRequestError && (error.isNotFound || error.isUnsupportedIdentifier)) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { idSlug } = await params;
  const product = await loadProduct(idSlug);
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? product.description ?? `${product.name} at neXgen Store.`,
    alternates: { canonical: `/products/${idSlug}` },
    openGraph: { images: product.images.slice(0, 1).map((image) => image.src) },
  };
}

/**
 * Product Detail archetype (`CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §5) —
 * composed directly here rather than through the generic Section engine
 * (`engine/renderSections.ts`), a deliberate choice: that engine earns its
 * keep for a *repeated, swappable-per-theme* arrangement of primitives
 * (Home/Category/Brand's own grids); a single Product Detail page's own
 * gallery+description+meta layout is not itself a list of interchangeable
 * Sections in this milestone (no CMS-authored product page content exists
 * to arrange yet) — real, honest composition now, not a forced abstraction
 * for a case this milestone doesn't actually have two ways to arrange.
 *
 * **Experience Polish Sprint 1, Pack 5 — "PDP Polish"** (on top of Beta
 * Experience Pack 1's own v3 Buy Box), per
 * `EXPERIENCE_POLISH_SPRINT_1_IMPLEMENTATION_ROADMAP.md` and
 * `NEXGEN_STOREFRONT_DESIGN_DNA.md` §2's choice-architecture principle —
 * every change below is presentation/composition only; no business logic,
 * cart mechanism, Buy Now flow, checkout flow, Gateway call, or
 * recommendation algorithm changed:
 * - **5.1 — CTA hierarchy**: `BuyNowButton` now renders first and carries
 *   `Button`'s own default `primary` (dominant) treatment; `AddToCartButton`
 *   follows with `emphasis="secondary"` — exactly one dominant purchase
 *   action per `NEXGEN_STOREFRONT_DESIGN_DNA.md` §15 rule #3, fixing the
 *   "two equal-weight buttons" friction named in
 *   `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` item 19.
 * - **5.2 — Stock prominence**: `StockBadge` moved from above the price to
 *   immediately above the CTA row — the real, existing signal now sits
 *   where it's actually decision-relevant, right before the buy decision.
 * - **5.3 — Visual rhythm**: the info column is now three explicit bands —
 *   **Decide** (identity, price, stock, the two real CTAs, COD), **Reassure**
 *   (trust badges, payment methods, couriers, the honest "more ways to buy"
 *   state, share), **Learn** (category context, description, FAQ/shipping/
 *   returns disclosures) — separated by a real `border-t` rule and spacing
 *   change, not just an unbroken column, per
 *   `NEXGEN_STOREFRONT_DESIGN_DNA.md` §2's "choice architecture" and §6's
 *   "Decide → Reassure → Learn" rhythm.
 * - **5.4 — Honest placeholder refinement**: the "More ways to buy" state
 *   now uses the same dashed-border, muted-surface treatment this
 *   platform's own `PromoCodePlaceholder` already established for a
 *   deliberate "coming soon" state — reads as intentional, not as an
 *   unfinished feature. Copy and meaning unchanged.
 * - **5.5 — see `StickyMobileBuyBar.tsx`'s own docblock** — Buy Now now
 *   reaches the sticky mobile bar too.
 *
 * **Experience Polish Sprint 1, Pack 5.5 — "PDP Premium Refinement"**
 * (a distinct follow-up sub-pack, not roadmap item 5.5 above) — a
 * presentation-only pass on top of Pack 5, per the Product Owner's own
 * "transform into a premium, high-converting experience, remaining
 * completely truthful" direction. No business rule, cart mechanism, Buy
 * Now flow, checkout flow, or Gateway call changed:
 * - The **Decide** band is now a real, boxed "Buy Box" card
 *   (`rounded-xl border shadow-elevation-1`) — a distinct, elevated
 *   surface beside the gallery, the clear focal point of the page, per
 *   `NEXGEN_STOREFRONT_DESIGN_DNA.md` §4's "premium" personality trait.
 * - `BuyNowButton` and `AddToCartButton` now share the exact same
 *   `size="lg"` height — a real, previously-unnoticed mismatch (Buy Now
 *   had no `size` prop at all and always rendered 4px shorter than Add to
 *   Cart) is fixed (`BuyNowButton.tsx`'s own docblock).
 * - `ProductGallery`'s main image and thumbnails, the trust card, and the
 *   "more ways to buy" placeholder all now share one consistent
 *   `rounded-xl`/`rounded-lg` corner language with the new Buy Box card
 *   and `ProductCard` v4, plus a resting elevation shadow on the gallery
 *   ("product photography on a pedestal," `NEXGEN_STOREFRONT_DESIGN_DNA.md`
 *   §1.1's Apple/Shopify reference).
 * - `PaymentMethodBadge`/`CourierBadge` (shared components, also used in
 *   `StoreFooter`) now lead with a small, honest, **generic category
 *   icon** (cash / mobile financial service / secure gateway / bank /
 *   delivery truck) — never a brand mark, never implying more integration
 *   than the label itself already claims.
 * - Gallery-to-info-column spacing increased (`lg:gap-12`) for more
 *   generous whitespace, and the Reassure band's redundant top rule was
 *   removed now that the Buy Box's own card edge already separates it.
 *
 * A field-by-field accounting of the v2 brief's own checklist, against
 * what the real Gateway `ProductDetail` actually carries:
 * - Gallery/Zoom/Thumbnail rail/Sticky image ✅ `ProductGallery`.
 * - Sticky buy section ✅ (`lg:sticky` on the info column — "buy" itself
 *   is Checkout, out of this milestone's scope; this is the info column
 *   staying in view while the gallery/description scroll).
 * - Breadcrumb ✅ `Breadcrumb`, built from `product.categories` (real).
 * - Brand ✅ resolved via `getBrand(product.brandId)` when present — the
 *   Gateway returns only the id on `ProductDetail`, same as `ProductCard`.
 * - Category ✅ `product.categories` (real, already on `ProductDetail`).
 * - SKU ✅ real. Availability ✅ `StockBadge` (see its own docblock for
 *   the real publish-state-vs-true-stock gap).
 * - Description ✅ real. **Specifications/Features** ❌ — the real
 *   `ProductDetail` has no attribute-value/specification field at all
 *   (Milestone 1's own scope: General+SEO fields only, confirmed against
 *   `gateway/types.ts`) — not rendered, named in
 *   `MISSING_ECOMMERCE_FEATURES_AUDIT.md`, not faked with empty rows.
 * - Downloads ❌ no such field/backend exists — omitted.
 * - Related Products / Recommended ✅ real, via `getRecommendations`
 *   (Gateway Slice 1.5, `related`/`recommended` slots — see that client's
 *   own docblock for exactly which real algorithm backs each today).
 * - Recently Viewed ❌ the Gateway's own `recently-viewed` slot is
 *   honestly empty today (no CDP view-history wiring) — not rendered
 *   rather than shown as a permanently-empty section.
 * - Cross-sell/Upsell ❌ no distinct real signal exists beyond what
 *   `related`/`recommended` already surface — not duplicated under a
 *   different label.
 * - FAQ/Shipping/Return ✅ real, working, keyboard-accessible native
 *   `<details>` disclosures — generic informational copy, not a
 *   fabricated claim about this store's own real policy (no Store
 *   Settings/policy backend exists yet, same honest-generic treatment as
 *   `TrustBar`'s own default items).
 * - Share ✅ real, fully functional (`ShareButton` — Web Share API with a
 *   real clipboard-copy fallback, not a backend-dependent feature).
 * - Structured Data ✅ `buildProductSchema`/`buildBreadcrumbSchema`
 *   (unchanged from Milestone 1). Image optimization ✅ `next/image`
 *   throughout (`ProductGallery`).
 * - **No price shown by default** — `PriceBlock`'s own honest empty
 *   state ("Price coming soon" as of Pack 2), since the Gateway still has
 *   no pricing route.
 *
 * Deliberately does not forward the request's Cookie header — see
 * `app/page.tsx`'s own docblock for why.
 *
 * **Beta Milestone 2.5 additions**: `StickyMobileBuyBar` (real, mobile-
 * only, keeps price/stock/a real inert Add-to-cart in thumb reach —
 * `pb-20 lg:pb-0` on this page's own root reserves the space it occupies
 * so it never overlaps the FAQ disclosures), `RecentlyViewedRail` (real,
 * `localStorage`-backed, excludes this product), `ViewTracker` (records
 * this real view), fullscreen gallery zoom (`ProductGallery.tsx`'s own
 * docblock), and `BackToTop`.
 *
 * **Beta Milestone 2.6 additions** — Commerce Readiness Layer, "Review
 * Foundation" and "Shipping Presentation" areas wired live:
 * - `RatingSummary`/`ReviewList` ✅ rendered with `averageRating={null}
 *   totalCount={0} reviews={[]}` — **honestly empty**, since no Review
 *   backend exists yet (no such module in `apps/backend`). Real
 *   components, real empty state ("No reviews yet"), not a fake 4.8★.
 * - `QASection` ✅ same treatment — `questions={[]}`, real "No questions
 *   yet" empty state, no Q&A backend exists.
 * - `ShippingCalculator` ✅ real working form nested inside the existing
 *   "Shipping information" disclosure — submitting shows an honest "not
 *   available yet" result (`Newsletter.tsx`'s own established pattern),
 *   never a fabricated shipping cost.
 * - **Deliberately not wired here**: `VariantSelector` (`ProductDetail`
 *   carries no variant data at all yet), `ReviewFilters`/`ReviewSort`
 *   (filtering/sorting an always-empty review list has no real purpose
 *   until reviews exist), real per-product delivery estimates/urgency
 *   counts (no real per-SKU inventory-count or order-velocity data is
 *   composed to the Storefront yet — inventing either would violate
 *   `NEXGEN_STOREFRONT_DESIGN_DNA.md` §0's anti-fabrication refusal).
 *
 * **Beta Sprint 3 — Cart Engine**: a real `AddToCartButton` sits in the
 * desktop info column and `StickyMobileBuyBar` takes the real
 * `productId`/`name`/`href`/`imageSrc` it needs to add a real line.
 * `unitPrice` is passed as `null` — this page still fetches no
 * `price`/`compareAtPrice` at all (no Gateway pricing route exists), so
 * the cart line is honestly priceless, exactly like `PriceBlock`'s own
 * empty state above it.
 */
export default async function ProductPage({ params }: PageProps) {
  const { idSlug } = await params;
  const product = await loadProduct(idSlug);

  const [brand, related, recommended] = await Promise.all([
    product.brandId ? getBrand(product.brandId).catch(() => null) : Promise.resolve(null),
    getRecommendations({ slot: 'related', productId: product.id, limit: 8 }, { revalidateSeconds: 180 }),
    getRecommendations({ slot: 'recommended', productId: product.id, limit: 8 }, { revalidateSeconds: 300 }),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const productUrl = `${siteUrl}/products/${idSlug}`;
  const breadcrumbItems = [{ name: 'Home', url: siteUrl }, ...product.categories.map((category) => ({ name: category.name, url: `${siteUrl}${categoryHref(category)}` })), { name: product.name, url: productUrl }];
  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);
  const productSchema = buildProductSchema(product, productUrl);

  const galleryImages = product.images.length > 0 ? product.images : product.image ? [product.image] : [];

  return (
    <div className="flex flex-col gap-10 pb-20 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <ViewTracker id={product.id} name={product.name} href={productUrl.replace(siteUrl, '')} imageSrc={product.image?.src ?? null} />

      <Breadcrumb items={[{ label: 'Home', href: '/' }, ...product.categories.map((category) => ({ label: category.name, href: categoryHref(category) })), { label: product.name }]} />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
        <ProductGallery images={galleryImages} productName={product.name} />

        <div className="flex flex-col gap-6 lg:sticky lg:top-20">
          {/* Decide — the Buy Box itself, boxed as its own distinct, premium surface so it reads as the page's clear focal point (Experience Polish Sprint 1, Pack 5.5) — identity, price, stock, the two real purchase actions, and the one immediate reassurance (COD), in the order a shopper actually needs them. */}
          <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-elevation-1">
            <div>
              {brand && (
                <Text as="p" variant="caption" className="uppercase tracking-wide text-text-secondary">
                  {brand.name}
                </Text>
              )}
              <Text as="h1" variant="display">
                {product.name}
              </Text>
              <Text variant="caption" className="mt-1 text-text-secondary">
                SKU: {product.sku}
              </Text>
            </div>

            <PriceBlock size="lg" />

            {product.shortDescription && <Text variant="body-strong">{product.shortDescription}</Text>}

            <div className="flex items-center gap-3">
              <StockBadge status={product.status} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <BuyNowButton
                productId={product.id}
                sku={product.sku}
                name={product.name}
                href={productUrl.replace(siteUrl, '')}
                imageSrc={product.image?.src ?? null}
                disabled={product.status !== 'active'}
                disabledReason="Unavailable"
                size="lg"
                className="w-full sm:w-auto"
              />
              <AddToCartButton
                productId={product.id}
                sku={product.sku}
                name={product.name}
                href={productUrl.replace(siteUrl, '')}
                imageSrc={product.image?.src ?? null}
                unitPrice={null}
                currencyCode={null}
                disabled={product.status !== 'active'}
                disabledReason="Unavailable"
                emphasis="secondary"
                size="lg"
                className="w-full sm:w-auto"
              />
            </div>

            <CodAvailableBadge />
          </div>

          {/* Reassure — real trust, payment, and delivery signals, plus the honest "not built yet" state, all grounded in real backend capability. Flows directly beneath the boxed Buy Box — its own card edge above already separates it, so no extra rule is needed here. */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-xl border border-border p-5">
              <TrustBadge icon={ShieldCheck} label="Secure payments" description="Your payment details stay protected" />
              <TrustBadge icon={TruckIcon} label="Nationwide delivery" description="Shipped across Bangladesh" />
            </div>

            <div className="flex flex-col gap-2">
              <Text as="p" variant="caption" className="font-medium uppercase tracking-wide text-text-secondary">
                Payment methods
              </Text>
              <PaymentMethodsRow methods={REAL_BACKEND_PAYMENT_METHODS} />
            </div>

            <div className="flex flex-col gap-2">
              <Text as="p" variant="caption" className="font-medium uppercase tracking-wide text-text-secondary">
                Delivery partners
              </Text>
              <div className="flex flex-wrap gap-1.5">
                {REAL_COURIERS.map((courier) => (
                  <CourierBadge key={courier} courier={courier} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-surface-subtle p-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                <Text as="p" variant="caption" className="font-medium uppercase tracking-wide">
                  More ways to buy
                </Text>
              </div>
              <Text as="p" variant="caption" className="text-text-secondary">
                Bundle deals, frequently-bought-together sets, and cross-sell picks are coming soon — no real
                bundling or co-purchase backend exists yet. &ldquo;Related products&rdquo; and &ldquo;You may also
                like&rdquo; below use today&apos;s real recommendation data instead.
              </Text>
            </div>

            <div className="flex items-center gap-2">
              <ShareButton title={product.name} />
            </div>
          </div>

          {/* Learn — context and detail for a shopper who wants more before or after deciding; never blocks the decide-stage content above it. */}
          <div className="flex flex-col gap-4 border-t border-border pt-8">
            {product.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.categories.map((category) => (
                  <Link key={category.id} href={categoryHref(category)}>
                    <Badge variant="outline">{category.name}</Badge>
                  </Link>
                ))}
              </div>
            )}

            {product.description && (
              <Text variant="body" className="whitespace-pre-line text-text-secondary">
                {product.description}
              </Text>
            )}

            <div className="flex flex-col divide-y divide-border">
              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-body-strong text-text-primary">
                  Shipping information
                  <span className="text-text-secondary transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="mt-2 flex flex-col gap-3">
                  <Text as="p" variant="body" className="text-text-secondary">
                    General shipping information — delivery windows and rates vary by destination and are confirmed at checkout.
                  </Text>
                  <ShippingCalculator />
                </div>
              </details>
              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-body-strong text-text-primary">
                  Returns
                  <span className="text-text-secondary transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <Text as="p" variant="body" className="mt-2 text-text-secondary">
                  General return information — eligibility and windows vary by item and are confirmed at checkout.
                </Text>
              </details>
              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-body-strong text-text-primary">
                  Questions about this product?
                  <span className="text-text-secondary transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <Text as="p" variant="body" className="mt-2 text-text-secondary">
                  Reach out to customer support for help before you buy.
                </Text>
              </details>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <ProductGrid products={related} buildHref={productHref} columns={4} heading="Related products" />
      )}
      {recommended.length > 0 && (
        <ProductGrid products={recommended} buildHref={productHref} columns={4} heading="You may also like" />
      )}

      <div className="flex flex-col gap-6">
        <SectionHeader eyebrow="Reviews" heading="Ratings & reviews" />
        <RatingSummary averageRating={null} totalCount={0} />
        <ReviewList reviews={[]} />
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeader eyebrow="Questions" heading="Questions & answers" />
        <QASection questions={[]} />
      </div>

      <RecentlyViewedRail excludeId={product.id} />

      <StickyMobileBuyBar
        productId={product.id}
        name={product.name}
        href={productUrl.replace(siteUrl, '')}
        imageSrc={product.image?.src ?? null}
        status={product.status}
      />
    </div>
  );
}
