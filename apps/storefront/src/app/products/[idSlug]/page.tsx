import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Breadcrumb,
  GatewayRequestError,
  PriceBlock,
  ProductGallery,
  ProductGrid,
  QASection,
  RatingSummary,
  RecentlyViewedRail,
  ReviewList,
  SectionHeader,
  ShippingCalculator,
  StickyMobileBuyBar,
  StockBadge,
  buildBreadcrumbSchema,
  buildProductSchema,
  extractIdFromSegment,
  getBrand,
  getProduct,
  getRecommendations,
} from '@nexgen/storefront-engine';
import { AddToCartButton } from '@nexgen/storefront-engine/client';
import { Badge, Text } from '@nexgen/ui';
import { ShareButton } from '@/components/ShareButton';
import { ViewTracker } from '@/components/ViewTracker';
import { categoryHref, productHref } from '@/lib/hrefs';

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
 * **Beta Milestone 2 — rebuilt to the milestone brief's own "Professional
 * Product Detail Page" spec**, field-by-field against what the real
 * Gateway `ProductDetail` actually carries:
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
 *   state, since the Gateway still has no pricing route (unchanged from
 *   Milestone 1, restated here since this is the highest-visibility page
 *   for it).
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
 *   carries no variant data at all yet — see `MERCHANT_CONVERSION_
 *   AUDIT.md` for a component with nothing real to select from is worse
 *   than no component), `ReviewFilters`/`ReviewSort` (filtering/sorting
 *   an always-empty review list has no real purpose until reviews
 *   exist), `PaymentMethodBadge`/`CourierBadge`/`AddressSelector` (the
 *   Milestone 2.6 brief's own "Bangladesh Commerce Layer" instruction:
 *   "Do NOT fake integrations. Prepare architecture only." — none of
 *   COD/bKash/Nagad/Pathao/Steadfast is actually integrated, so none is
 *   claimed on a live page).
 *
 * **Beta Sprint 3 — Cart Engine**: a real `AddToCartButton` now sits in
 * the desktop info column (previously no desktop add-to-cart affordance
 * existed at all — only the mobile sticky bar had one) and
 * `StickyMobileBuyBar` now takes the real `productId`/`name`/`href`/
 * `imageSrc` it needs to add a real line. `unitPrice` is passed as
 * `null` — this page still fetches no `price`/`compareAtPrice` at all
 * (no Gateway pricing route exists), so the cart line is honestly
 * priceless, exactly like `PriceBlock`'s own empty state above it.
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

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <ProductGallery images={galleryImages} productName={product.name} />

        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
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

          <div className="flex items-center gap-3">
            <StockBadge status={product.status} />
          </div>

          <PriceBlock size="lg" />

          {product.shortDescription && <Text variant="body-strong">{product.shortDescription}</Text>}

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
            size="lg"
            className="w-full sm:w-auto"
          />

          <div className="flex items-center gap-2">
            <ShareButton title={product.name} />
          </div>

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

          <div className="flex flex-col divide-y divide-border border-t border-border">
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
