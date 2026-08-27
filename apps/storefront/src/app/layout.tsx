import type { Metadata } from 'next';
import { BackToTop, getBranding, getCategories, StoreFooter, StoreHeader } from '@nexgen/storefront-engine';
import { CartDrawerProvider } from '@nexgen/storefront-engine/client';
import { categoryHref } from '@/lib/hrefs';
import './globals.css';

/**
 * Beta Experience Pack 1 — the real, published `storeName`/favicon now
 * drive this root metadata (`getBranding()`, `APPEARANCE_WORKSPACE_
 * SPECIFICATION.md` §4) instead of the previous hardcoded `'neXgen
 * Store'` literal — the single clearest "generic template" fact this
 * whole Pack exists to fix (`EVIDENCE_BASED_PLATFORM_AUDIT.md` Part 5's
 * own named finding). `generateMetadata`/static `metadata` per route
 * still composes with this root default (`STORE_FRONTEND_ARCHITECTURE.md`
 * §5) — `title.template` means every page's own title only needs to
 * supply its own segment, never repeat the site name.
 */
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding({ revalidateSeconds: 60 });
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: branding.storeName, template: `%s | ${branding.storeName}` },
    description: `${branding.storeName} — an online store.`,
    robots: { index: true, follow: true },
    icons: branding.favicon ? { icon: branding.favicon.url } : undefined,
  };
}

/**
 * The Core (`THEME_ENGINE_ARCHITECTURE.md` §2.1) — routing, request
 * lifecycle, and the app shell itself.
 *
 * **Beta Milestone 2**: the header/footer are real now — `StoreHeader`'s
 * own mega-menu and `StoreFooter`'s own "Shop" column are both built from
 * one real `getCategories()` call made once, here, at the root layout
 * (every route already renders inside this layout, so this is a single
 * fetch shared across the whole site, not a per-page cost — Next.js's own
 * Data Cache additionally dedupes this against any per-page
 * `getCategories()` call within the same request). Deliberately still no
 * merchandising/visual opinion beyond what `StoreHeader`/`StoreFooter`
 * themselves encode — no real Theme Package exists yet (M3), and no CMS
 * Menu exists yet (M2) to source a merchant-authored navigation structure
 * from (`CMS_ARCHITECTURE.md` §3.4), so the real category tree is the
 * honest source of truth for navigation until one exists.
 *
 * **Beta Sprint 3 — Cart Engine**: `CartDrawerProvider` wraps the whole
 * shell, once, here — the single site-wide `CartDrawer` instance every
 * `AddToCartButton` and `StoreHeader`'s own cart icon share
 * (`CartDrawerProvider.tsx`'s own docblock). `StoreHeader` must render
 * inside this provider (it calls `useCart`/`useCartDrawerControls`
 * itself for its badge count and click handler), so this wraps
 * `StoreHeader` too, not only `{children}`.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, branding] = await Promise.all([
    getCategories({ revalidateSeconds: 300 }),
    getBranding({ revalidateSeconds: 60 }),
  ]);
  // StoreHeader is a real Client Component (mega-menu/drawer/search open
  // state) — a plain function cannot cross the Server→Client boundary as
  // a prop (found live via a real `next build` prerender failure), so its
  // own `categories` carry an already-computed `href`, built here on the
  // server, rather than a `categoryHref` function prop. StoreFooter has
  // no such constraint (it renders entirely on the server) and keeps the
  // same `buildHref`-function pattern every other Server Component grid
  // primitive uses.
  const navCategories = categories.data.map((category) => ({ ...category, href: categoryHref(category) }));

  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <CartDrawerProvider>
          <StoreHeader categories={navCategories} branding={branding} />
          <main id="main-content" className="mx-auto max-w-6xl px-4 py-8">
            {children}
          </main>
          <StoreFooter categories={categories.data} categoryHref={categoryHref} branding={branding} />
          <BackToTop />
        </CartDrawerProvider>
      </body>
    </html>
  );
}
