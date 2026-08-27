import type { Metadata } from 'next';
import { PromotionBanner, RecentlyViewedRail, getHomepage, getProducts, getRecommendations, resolveSections, resolveTemplate, buildOrganizationSchema, buildWebsiteSchema } from '@nexgen/storefront-engine';
import { brandHref, categoryHref, productHref } from '@/lib/hrefs';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Browse our full catalog of products.',
  alternates: { canonical: '/' },
};

/**
 * The homepage archetype (`THEME_ENGINE_ARCHITECTURE.md` §6) — no CMS
 * backend exists yet (M2) to author a real Page here, so this route
 * renders the Storefront Engine's own built-in default Template
 * (`defaultTemplates.homepage`) populated with real Gateway data, per
 * that document's own §3 step 4 "always renders something" guarantee.
 * Real Server Component, SSG+ISR (`STORE_FRONTEND_ARCHITECTURE.md` §2) —
 * the `revalidateSeconds` on each Gateway call is what makes this ISR.
 *
 * **Beta Milestone 2**: adds Trending (`getRecommendations`, real Gateway
 * Slice 1.5 route — see its own docblock for exactly which real algorithm
 * backs it today) and Recently Added (`getProducts` sorted by real
 * `created_at`) as two more real, independently-fetched product rails —
 * distinct real data, not the same list relabeled. Neither call forwards
 * the visitor's cookie (same reasoning as every other call on this page),
 * so `getRecommendations` here is the store-wide, not per-visitor, result.
 *
 * **Deliberately does not forward the incoming request's Cookie header**
 * (a real fix, found live via `next build`'s own route-type output —
 * every route showed up `ƒ` Dynamic instead of `○`/ISR): calling
 * `next/headers`'s `headers()`/`cookies()` at all forces Next.js to opt
 * the WHOLE route out of static generation, not just that one fetch — and
 * Category A data (products/categories/brands) never varies per visitor,
 * so there is nothing to gain from forwarding it here. The guest-session
 * cookie still mints correctly via `middleware.ts` regardless of whether
 * any given page reads it; only a genuinely visitor-specific route
 * (Category B — cart/account, a later milestone) should call
 * `getRequestCookie()` and accept the resulting SSR trade-off, per
 * `STORE_FRONTEND_ARCHITECTURE.md` §2's own rendering-mode table.
 *
 * **Experience Polish Sprint 1, Pack 1 — Homepage Hierarchy** (presentation
 * and section-order only; zero new Gateway call, zero new client JS, same
 * three `Promise.all` fetches this route already made):
 * - The Hero now renders first, alone, followed by the (now quieter,
 *   `tone="subtle"`) `PromotionBanner` — previously the banner rendered
 *   above the Hero, undermining the Hero's own claim to being the page's
 *   strongest visual anchor.
 * - The Hero's own real `cta` now points at `#featured-products`, a real
 *   in-page anchor on the Featured Products section below — not a new
 *   route, not a fabricated destination.
 * - Section order (`theme/defaultTemplates.ts`'s own `homepageSections`)
 *   now follows Hero → Featured → Categories → Trending/Recently Added →
 *   Brands → Trust → Newsletter, the Product Owner's own specified flow —
 *   same eight real sections, same real data, only the arrangement changed.
 * - Inter-section spacing increased (`gap-12` → `gap-16`) so each section
 *   reads as its own destination, per `NEXGEN_STOREFRONT_DESIGN_DNA.md`'s
 *   "whitespace does the persuading" principle — no new dividers or
 *   background treatments, restraint over decoration.
 */
export default async function HomePage() {
  const [homepage, recentlyAdded, trending] = await Promise.all([
    getHomepage(),
    getProducts({ sort: 'created_at', direction: 'desc', perPage: 8 }, { revalidateSeconds: 180 }),
    getRecommendations({ slot: 'trending', limit: 8 }, { revalidateSeconds: 300 }),
  ]);

  const template = resolveTemplate('homepage');
  const resolved = resolveSections({
    sections: template.defaultSections,
    data: {
      hero: {
        heading: 'Welcome to the store',
        subheading: 'Real products, real prices, one system — never two that can drift apart.',
        cta: { label: 'Shop now', href: '#featured-products' },
      },
      'category-grid': {
        categories: homepage.categories.filter((category) => category.parentId === null),
        buildHref: categoryHref,
        columns: 4,
        heading: 'Shop by category',
      },
      'featured-products': {
        products: homepage.products,
        buildHref: productHref,
        columns: 4,
        heading: 'Featured products',
        emptyTitle: 'No products yet',
        emptyDescription: 'Check back soon.',
      },
      'trending-products': {
        products: trending,
        buildHref: productHref,
        columns: 4,
        heading: 'Trending now',
        description: 'A live, recency-based ranking of what shoppers are seeing right now.',
        emptyTitle: 'Nothing trending yet',
        emptyDescription: 'Check back soon.',
      },
      'recently-added': {
        products: recentlyAdded.data,
        buildHref: productHref,
        columns: 4,
        heading: 'Recently added',
        emptyTitle: 'No new arrivals yet',
        emptyDescription: 'Check back soon.',
      },
      'brand-slider': { brands: homepage.brands, buildHref: brandHref, heading: 'Shop by brand' },
    },
  });

  const organizationSchema = buildOrganizationSchema({ name: 'neXgen Store', url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000' });
  const websiteSchema = buildWebsiteSchema({ name: 'neXgen Store', url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000' });

  // Experience Polish Sprint 1, Pack 1 (Homepage Hierarchy) — the Hero is
  // rendered on its own, first, so it is unambiguously the first thing a
  // visitor sees (previously the generic PromotionBanner rendered ABOVE
  // it). `defaultTemplates.ts`'s own `homepageSections` always places
  // `hero` first, so this destructure is safe, not an assumption about
  // section order made twice in two places.
  const [heroSection, ...restSections] = resolved;

  return (
    <div className="flex flex-col gap-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      {heroSection && <heroSection.Component {...heroSection.props} />}
      {/* Beta Milestone 2.5 — real, generic campaign-strip copy only; no Marketing-module Promotion is composed through the Gateway yet (`PromotionBanner.tsx`'s own docblock) — never a fabricated discount or invented sale name. Pack 1: moved below the Hero and given the quieter `subtle` tone so the Hero itself stays the page's single strongest visual anchor. */}
      <PromotionBanner heading="New arrivals every week" description="Fresh stock, added regularly." tone="subtle" />
      {restSections.map(({ key, Component, props }) =>
        key === 'featured-products' ? (
          <div key={key} id="featured-products" className="scroll-mt-24">
            <Component {...props} />
          </div>
        ) : (
          <Component key={key} {...props} />
        ),
      )}
      <RecentlyViewedRail />
    </div>
  );
}
