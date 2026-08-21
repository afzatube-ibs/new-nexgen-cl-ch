# Missing Ecommerce Features Audit — Beta Milestone 2

**Written in the voice this milestone's own brief asked for: Shopify Product Team, Amazon UX Team, Microsoft Design Team, Stripe Design Team, reviewing every customer-facing screen this platform has today, for a merchant selling 50,000 orders/day. Nothing here is a criticism of what was built — every item below is either a real backend gap (no fabricated data exists to surface) or a deliberate, explicitly-scoped-out capability (Search backend, Cart, Checkout, Account). The point of this document is that none of it is silently skipped.**

Severity key: 🔴 Launch-blocking (a merchant cannot sell without this) · 🟠 Expected-by-default (every competitor has it; its absence is conspicuous) · 🟡 Real gap, lower urgency · ⚪ Explicitly out of this milestone's scope (named for completeness, not a surprise)

---

## 1. Pricing & Merchandising

### 1.1 🔴 No price is shown anywhere on the storefront
The Gateway's `ProductSummary`/`ProductDetail` (`packages/storefront-engine/src/gateway/types.ts`) carry no price field at all — confirmed by direct code read of `apps/store-api-gateway/src/composition/mappers.ts`. The real Pricing module (Price Lists, Checkout Price Preview — built and frozen in Phase 2.4) has never been composed into the public Catalog routes. Every real product page live-verified this milestone renders `PriceBlock`'s own honest "Price unavailable" state — real, not fabricated, but this is the single highest-severity gap on the entire storefront. **No ecommerce site ships without a visible price.** Fix: a Gateway route (or an extension of `GET /v1/products`) that resolves the active Price List entry for the requesting store/currency and composes it into the response, the same way `toProductSummary` already composes images.

### 1.2 🔴 No discount/compare-at-price data
`PriceBlock` supports a real `compareAtPrice` prop and computes a real discount percentage when both prices are present and valid (`packages/storefront-engine/src/components/PriceBlock.tsx`) — but nothing feeds it one today, for the same reason as 1.1.

### 1.3 🟠 No currency/locale-aware formatting wired to the real Store Context
`PriceBlock.formatMoney` uses `Intl.NumberFormat` with a hardcoded default `locale = 'en'`, never the real `StoreContext.locale`/`.currency` (`packages/storefront-engine/src/context/storeContext.ts`, which already resolves both from the URL). Given this milestone's own explicit "Bangladesh first" mandate, this is a real, nameable gap: once 1.1 lands, price formatting must resolve BDT (৳) by default, not assume USD/`en`.

### 1.4 🟡 No product variant/attribute selection (size, color, etc.)
`ProductDetail` (Milestone 1's own scope: General + SEO fields only) has no attribute-value or variant data. A real PDP for apparel, electronics-with-storage-tiers, or any variant-bearing catalog needs this before "Add to Cart" is even meaningful. Named here since it's the single most expected PDP interaction on Amazon/Shopify and doesn't exist as data yet, not just as UI.

### 1.5 🟡 No product specifications/features table
Same root cause as 1.4 — no attribute-value data exists on `ProductDetail` to render a real spec table. `ProductCard.tsx`'s own docblock and `products/[idSlug]/page.tsx`'s own docblock both name this explicitly rather than rendering an empty or fabricated table.

### 1.6 🟡 No "Downloads" section content
No such field or backend capability exists (digital product downloads, spec sheets, manuals). Not rendered.

---

## 2. Product Discovery Signals

### 2.1 🟠 No real "New," "Hot," "Trending," or "Low stock" badges
`StockBadge.tsx`'s own docblock names this precisely: the only real signal the Gateway exposes is `ProductSummary.status` (a publish-state field), never a `publishedAt` date, a view/sales counter, or true per-SKU stock quantity. "In Stock"/"Unavailable" is honestly derived from `status`; the other four badge types the milestone brief asked for have **no real backing data** and are not rendered — a fabricated star or badge would be a worse outcome than an honest gap.

### 2.2 🟠 No true per-SKU stock quantity ("3 left," "Out of stock" distinct from unpublished)
The Inventory module (`apps/admin`'s own Stock Levels screen, frozen in Phase 2.3) has real per-warehouse quantity/reservation data — the Gateway has no public Catalog↔Inventory composition route to expose it to the Storefront. This is a genuinely high-value, buildable gap: a `GET /v1/products` availability field sourced from Inventory would immediately upgrade `StockBadge` from a publish-state proxy to a real stock signal.

### 2.3 🟡 "Popular" section not built at all
Deliberately omitted from the Homepage (`theme/defaultTemplates.ts`'s own comment explains why) rather than relabeling "Recently Added" or "Trending" data under a third, fake-distinct name. No sales-count or view-count aggregate exists anywhere in the Gateway to back a real "Popular" ranking.

### 2.4 🟡 "Recently Viewed" section not built
The Gateway's own `/v1/recommendations/recently-viewed` slot exists and is called correctly by this milestone's `getRecommendations` client (`packages/storefront-engine/src/gateway/recommendations.ts`) — it honestly returns an empty array today (no CDP view-history event wiring feeds it yet, per `recommendations/engines/trendingFallbackEngine.ts`'s own docblock). Not rendered, rather than shown as a permanently-empty section.

### 2.5 🟡 No distinct Cross-sell/Upsell sections
Related and Recommended (built this milestone, real, via the Gateway's `related`/`recommended` recommendation slots) are the only two distinguishable real signals today — both currently resolve to the same recency-based fallback algorithm. A true Cross-sell (frequently-bought-together) or Upsell (higher-margin alternative) needs a real, distinct algorithm behind it before it would be honest to add a third/fourth section using the same underlying data under different labels.

### 2.6 🟡 No product reviews or star ratings
Restated from Milestone 1's own finding, still true: no reviews backend exists anywhere in the platform. No star row (not even an empty one) is rendered on `ProductCard` — an empty star row would itself imply "0 stars," a fabricated signal.

---

## 3. Search

### 3.1 🟠 Search overlay is real UI, with no results backend wired in
This milestone's own brief explicitly scoped Search UX Foundation to "NO search backend. Only UI." `SearchOverlay.tsx` is built, real, keyboard-accessible, with a genuinely working `localStorage`-backed Recent Search feature — but submitting a query shows an honest "Search results aren't available yet" message rather than navigating to a results page that doesn't exist. **Important finding**: a real, working Gateway search route already exists (`GET /v1/search`, `apps/store-api-gateway/src/routes/catalog.ts`, calling the real backend's own `search/products` module) — this is not a backend gap, it's an unwired one. Wiring `SearchOverlay`'s submit handler to a new `/search?q=` results page (built on the same `ProductGrid`/`Pagination`/`FilterSidebar` components already shipped this milestone) is comparatively low-effort, real, near-term work.

### 3.2 🟡 No autocomplete/suggestions-as-you-type
No backend exists for this (a genuinely different capability from full-text search — typically a dedicated, low-latency index). Not built, and the overlay's own "Suggestions" concept was scoped to "architecture only," honored by not rendering any list at all while typing (no fabricated suggestions).

### 3.3 🟡 No real "Popular searches"
No search-query-log/analytics backend exists to source real popular terms from. `SearchOverlay` renders an honest "Popular searches will appear here once available" message rather than a static, invented list (e.g., "iPhone," "Shoes") that would misrepresent this store's own real search demand.

---

## 4. Navigation & Site Structure

### 4.1 🟡 No `/brands` index page
Only `/brands/[idSlug]` detail pages exist (Milestone 1 scope) — there is no way to browse "all brands." The Footer and mega-menu therefore cannot offer a real "Shop all brands" link.

### 4.2 🟡 No `/categories` index page
Same gap as 4.1 for categories — the mega-menu's own real category tree is the only real category-browsing surface today.

### 4.3 🟡 No Company/Support footer columns (About, Contact, Careers, Help, Shipping Policy, Return Policy pages)
`StoreFooter.tsx`'s own docblock names this explicitly: these are real, expected ecommerce footer content, but no CMS-authored-page backend exists yet (out of this milestone's own explicit scope — "DO NOT BUILD: CMS editor"). The footer link tos only real routes (Shop/category links) rather than dead-linking to pages that don't exist.

### 4.4 🟡 Announcement bar has no real content source
`StoreHeader`'s own `announcement` prop is real and rendered when present — no page currently passes one, since no promotions/announcements backend exists to source real copy from (a Marketing-module Promotion is the natural real source once composed through the Gateway).

### 4.5 🟡 No locale/currency switcher UI
`StoreContext` already resolves `locale`/`currency` from the URL (`?locale=`/`?currency=`) — no visible UI control lets a shopper actually change either. Given "Bangladesh first, globally scalable," a real switcher is expected storefront chrome once a second locale/currency is actually supported.

---

## 5. Account, Cart, Checkout ⚪

Explicitly out of this milestone's scope, per its own brief ("DO NOT BUILD: checkout, payment, customer login"). Named here only for completeness, since a merchant reading this audit needs the full picture: Account, Cart, and Checkout are the three largest remaining gaps between this platform and a sellable storefront, and none of them were expected to close this milestone.

- **Account/Login** ⚪ — Header's Account icon is a real, honestly-inert affordance (`aria-label="Account — coming soon"`).
- **Cart** ⚪ — Header's Cart icon, same treatment. No cart session, no line-item state, no persisted cart anywhere.
- **Wishlist backend** ⚪ — `ProductCard`'s Wishlist button is real and inert, same pattern.
- **Quick View backend** ⚪ — real inert button; no modal/quick-view content pipeline exists.
- **Compare backend** ⚪ — real inert button; no comparison-table capability exists.
- **Newsletter subscription backend** ⚪ — `Newsletter.tsx` is a real, working form UI with an honest "not available yet" result — no email-marketing integration exists on the Gateway or Commerce backend.

---

## 6. Engineering Foundations (carried over from `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md`, not closed this milestone)

These were named in Milestone 1's own architecture review and remain open — restated here rather than silently dropped, per this milestone's own "implement every recommendation that belongs inside this milestone" instruction (§7 of that review lists its own top 5; three of five were implemented this milestone, tracked in `BETA_MILESTONE_2_CUSTOMER_EXPERIENCE_REPORT.md`'s own recommendation table):

- 🟡 **No `generateStaticParams()`** for top products/categories — every detail route still pays a real Gateway round-trip on first hit, forever, for any path not already warm.
- 🟡 **No CI workflow** covering `packages/storefront-engine`/`apps/storefront` — this milestone's own quality gates (typecheck/lint/test/build, all green) still run only by hand.
- 🟡 **No component-level RTL/jsdom tests** for the Store Components library — `packages/storefront-engine`'s Vitest environment is `node` (a real, legitimate choice for its pure-logic test suite); rendering tests for the ~20 new UI components this milestone shipped would need a jsdom project added, not yet done. Live browser verification substituted for this at Beta-review time, real but not a CI-runnable regression guard.
- 🟡 **No bundle-size budget/CI check** for `apps/storefront`.
- 🟡 **No Storybook / visual reference** for the Store Components library — a future theme author (M3) has no fast, isolated way to see `ProductCard`/`FilterSidebar`/etc. render with edge-case data without a running Gateway.
- 🟡 **`packages/ui`'s barrel-export pattern** is still the deeper root cause behind every cross-bundler workaround this platform has needed (`packages/ui/COMPATIBILITY.md`, written this milestone, documents the workaround; the per-component-subpath-exports fix itself remains unbuilt, by design — a real, non-trivial refactor named for a future phase).

---

## 7. What This Milestone Gets Right (stated plainly, matching this document's own honesty bar)

- Every honest-empty-state pattern in this document is a *design decision made visible*, not a bug: `PriceBlock`, `StockBadge`, `ProductGallery`, `SearchOverlay`, and `Newsletter` all fail toward "show nothing / say so plainly" rather than fabricating a number, a star, a suggestion, or a success message.
- The real Gateway `/v1/search` and `/v1/recommendations/*` routes this milestone discovered and wired (Trending/Related/Recommended) prove the Gateway's own platform investment (Slice 1.5) is already paying for itself — two of this document's gaps (3.1, 2.4/2.5) are "wire it up," not "build it from zero."
- Every filter, sort, and pagination control shipped this milestone is a real, bookmarkable URL — not a client-only state that breaks on refresh or can't be shared.

---

End of audit.
