# Experience Polish Sprint 1 — Implementation Roadmap

**Status: Planning artifact only. No code has been written. This document sequences and details work already justified by the frozen governing references below — it adds no new philosophy, no new architecture, and no new product decision. It is the tactical execution plan `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` itself named as the next step, made concrete against the codebase as it exists today.**

**Governing references (frozen, not reopened or contradicted by anything below):** `NEXGEN_PRODUCT_MASTER_VISION.md`, `01_PRODUCT_VISION.md`, `02_PRODUCT_PRINCIPLES.md`, `03_SYSTEM_ARCHITECTURE.md`, `04_MODULE_ARCHITECTURE.md`, `05_DATA_ARCHITECTURE.md`, `THEME_ENGINE_ARCHITECTURE.md`, `STORE_FRONTEND_ARCHITECTURE.md`, `CUSTOMER_EXPERIENCE_ARCHITECTURE.md`, `STOREFRONT_COMPONENT_ENGINE.md`, `LANDING_ENGINE_ARCHITECTURE.md`, `NEXGEN_STOREFRONT_DESIGN_DNA.md`, `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md`.

**Method:** the repository was re-read this pass, file by file, specifically to catch drift between the audit's own findings and the code's current state before committing to a roadmap against stale information. Two real corrections came out of that re-read, stated here rather than silently folded in:

1. **`ProductToolbar.tsx` already renders a real result count** ("128 results," from the Gateway's own pagination `total`) — the audit's item 13 is **already satisfied**. Removed from this roadmap as a no-op, not carried forward as work.
2. **The Brand listing page (`apps/storefront/src/app/brands/[idSlug]/page.tsx`) is materially less developed than Category** — a bare heading and a `ProductGrid`, with no `Breadcrumb`, `PromotionBanner`, `RecentlyViewedRail`, or merchandising treatment at all. The audit didn't name this because it scoped the Category page specifically; this pass surfaces it as a real, additive item folded into Pack 4, since it is the *same* underlying components, not a new pattern (`DNA:RULES` #27, consistency over novelty).

Every item below was re-verified against the real, current source — not assumed from the audit's own description of it three weeks prior.

---

## 0. Global Gates — Apply to Every Pack, Every Item

Restated once here, referenced by number in each item below rather than repeated forty times:

- **G1 — No fabricated data.** Every item either renders real data already available through an existing Gateway call, or is explicitly marked "contingent" with the exact real data/config dependency it needs before it may ship (per `DNA:PHILOSOPHY` §0's refusal, `DNA:RULES` #1).
- **G2 — No duplicated components.** Every new component is justified against `STOREFRONT_COMPONENT_ENGINE.md`'s own inventory and this platform's own "compose, don't proliferate" discipline (`DNA:COMPONENT_PHILOSOPHY`, `DNA:RULES` #6). See §9 for the explicit confirmation table.
- **G3 — No architecture change.** Every item is presentation, composition, or a same-shape Gateway call already proven elsewhere. Nothing here adds a backend module, changes a module boundary, or touches `MODULE:*`/`ARCH:*` decisions. One item (Pack 6, Free-Shipping Progress) needs a small Appearance-schema field addition and is flagged, not assumed, exactly like Beta Experience Pack 1's own precedent for extending that same module.
- **G4 — SSR/ISR preserved.** No item converts a currently-static (SSG/ISR) route to a dynamic one, or adds a data fetch that would force that conversion (`STORE_FRONTEND_ARCHITECTURE.md` §2's rendering-mode table is never renegotiated silently, per `DNA:PERFORMANCE`).
- **G5 — Accessibility preserved or improved, never regressed.** Every new interactive element meets WCAG AA and the 44×44px touch-target floor from first implementation, not as a follow-up pass (`DNA:ACCESSIBILITY`).
- **G6 — Bundle size preserved.** No item adds a new client-side dependency without an explicit justification recorded in that item's own "Performance impact" field; new components are expected under 1KB gzipped each, consistent with `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` §9's own estimate.
- **G7 — Mobile-first.** Every item is designed and verified at 375px before 1280px, per `DNA:MOBILE`.

---

## Pack 1 — Homepage Hierarchy

Covers the Homepage itself and the "arrival-stage" chrome that renders alongside it (`DNA:JOURNEY`'s Landing stage groups these) — the announcement bar and mega-menu are Header-owned components, folded in here rather than given their own pack because the user's own pack list names no separate Header pack and their effect is felt first at arrival.

### 1.1 — Hero visual rebuild

1. **Component(s):** `primitives/Hero.tsx`
2. **Files:** `packages/storefront-engine/src/primitives/Hero.tsx`
3. **Type:** Refactor (visual only — props contract `{ heading, subheading?, cta? }` unchanged, per `DNA:COMPONENT_PHILOSOPHY`'s public-contract rule)
4. **Dependencies:** None. Consumes `StorefrontBranding.primaryColor`/`accentColor`, already fetched at root layout and already passed through the existing render path.
5. **Risk:** Low — single component, no data-shape change, used only on the homepage today.
6. **Testing:** Visual verification at 375px/768px/1280px; confirm `Hero` still renders correctly with no `cta` and no `subheading` (its existing honest-minimal states); Lighthouse/CLS check (no new `next/image` usage introduced here — text/color only).
7. **UX improvement:** Replaces a flat, gray, undifferentiated text box with a confident, branded first screen — directly answers `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` item 1. Serves CTR.
8. **Performance impact:** None measurable — CSS/token changes only, zero new JS.
9. **Merchant impact:** Every merchant's homepage immediately looks less generic using their own already-configured brand color — zero new configuration required.

### 1.2 — Hero → Category "shop now" link

1. **Component(s):** `primitives/Hero.tsx` (existing `cta` prop, currently often omitted on the homepage), `apps/storefront/src/app/page.tsx`
2. **Files:** `apps/storefront/src/app/page.tsx`
3. **Type:** Additive (supplies a real `cta` pointing at the top category or full catalog — no component change)
4. **Dependencies:** 1.1 (visual rebuild) should land first so the CTA sits inside the finished Hero, not the old one.
5. **Risk:** Low.
6. **Testing:** Confirm the link resolves via the existing `categoryHref`/catalog-root pattern; keyboard/focus check on the new CTA.
7. **UX improvement:** Ends the first screen on an action instead of a scroll invitation (audit item 2). Serves CTR.
8. **Performance impact:** None — a `<Link>`, already a pattern used everywhere on this site.
9. **Merchant impact:** None required from the merchant; automatic once real categories exist.

### 1.3 — Rail re-tiering (Trending visually dominant)

1. **Component(s):** `apps/storefront/src/app/page.tsx` (section composition), `primitives/ProductGrid.tsx` (a new optional size/emphasis variant)
2. **Files:** `apps/storefront/src/app/page.tsx`, `packages/storefront-engine/src/primitives/ProductGrid.tsx`
3. **Type:** Refactor to `page.tsx`'s section ordering/props; additive optional prop on `ProductGrid` (e.g. an `emphasis?: 'default' | 'primary'` flag controlling heading size/columns) — existing callers unaffected by an optional prop with a safe default.
4. **Dependencies:** Pack 2 (Product Card v4) should land first so every rail already renders the improved card — resequencing rail *prominence* before the card itself looks right would need redoing.
5. **Risk:** Medium — touches the homepage's own section order, the single most-visited page; regressions here are the most visible on the whole site.
6. **Testing:** Full visual regression pass on homepage at all three breakpoints; confirm `ProductGrid`'s existing call sites (Category, Brand, PDP related/recommended) are unaffected by the new optional prop's default.
7. **UX improvement:** Gives the eye a clear first stop instead of six identical rails (audit item 3). Serves CTR and discovery-stage momentum (`DNA:JOURNEY`).
8. **Performance impact:** None — no new data fetch, `Trending` is already fetched today.
9. **Merchant impact:** None required; automatic re-tiering of data the merchant already has (Trending is real, recency-based).

### 1.4 — TrustBar reposition

1. **Component(s):** `apps/storefront/src/app/page.tsx` (section order only)
2. **Files:** `apps/storefront/src/app/page.tsx`
3. **Type:** Refactor (reorder existing `resolveSections`/Template composition — no component code changes to `TrustBar.tsx` itself)
4. **Dependencies:** None.
5. **Risk:** Low.
6. **Testing:** Visual confirmation of new position; confirm no layout-shift regression from moving a block earlier in the DOM.
7. **UX improvement:** Trust reads best before repeated asks, not after (audit item 4). Serves confidence.
8. **Performance impact:** None — same component, same data, different position.
9. **Merchant impact:** None.

### 1.5 — PromotionBanner visual treatment

1. **Component(s):** `components/PromotionBanner.tsx`
2. **Files:** `packages/storefront-engine/src/components/PromotionBanner.tsx`
3. **Type:** Refactor (visual only — `tone`/`heading`/`description`/`href` contract unchanged)
4. **Dependencies:** None.
5. **Risk:** Low — used on Homepage and Category pages today; verify both call sites after the change.
6. **Testing:** Visual check on both real call sites (`app/page.tsx`, `categories/[idSlug]/page.tsx`); confirm the `brand`/`subtle` tone distinction still reads correctly in dark mode if/when the storefront supports it.
7. **UX improvement:** Makes the honest, generic "New arrivals every week" copy look like a deliberate merchandising strip, not a system notice (audit item 5).
8. **Performance impact:** None.
9. **Merchant impact:** None; the banner's copy remains merchant-editable only once CMS exists (named, correctly out of scope).

### 1.6 — Announcement bar visual treatment

1. **Component(s):** `components/StoreHeader.tsx` (announcement bar block only)
2. **Files:** `packages/storefront-engine/src/components/StoreHeader.tsx`
3. **Type:** Refactor (visual only — `branding.announcement` contract unchanged)
4. **Dependencies:** None.
5. **Risk:** Low, but touches the sitewide header — verify on every page template, not just homepage.
6. **Testing:** Confirm rendering with `announcement.enabled: false` (must stay absent, not an empty bar); confirm with a real merchant-set primary color and with none set (fallback `bg-brand`).
7. **UX improvement:** Reads as a value proposition (with an icon) rather than a flat system banner (audit item 7).
8. **Performance impact:** None — no new dependency, an inline icon already available via `lucide-react` (already a dependency).
9. **Merchant impact:** None required; automatic.

### 1.7 — Mega-menu category thumbnails

1. **Component(s):** `components/StoreHeader.tsx` (desktop `DropdownMenu` content)
2. **Files:** `packages/storefront-engine/src/components/StoreHeader.tsx`
3. **Type:** Additive (renders `CategorySummary.image`, a real field already fetched by `getCategories()` at the root layout but not currently rendered in the menu)
4. **Dependencies:** None.
5. **Risk:** Low-medium — most categories in the current seed catalog have no image (`CategoryBanner.tsx`'s own docblock already notes this), so the honest "no image" fallback must be correct and unobtrusive, not a broken-looking gap.
6. **Testing:** Verify with a category that has a real image and one that doesn't; confirm `next/image` usage doesn't regress the header's own LCP-sensitive position (logo/first paint).
7. **UX improvement:** Real imagery in navigation instead of a plain text list (audit item 10). Serves discovery-stage CTR.
8. **Performance impact:** Small, real cost — new below-the-fold-until-opened images; mitigate with `loading="lazy"` and small, capped thumbnail dimensions (this pack's own Pack 12 image-tuning pass re-verifies this specifically).
9. **Merchant impact:** A merchant who has never uploaded a category image sees no change until they do — never a broken placeholder.

**Named, not built, in this pack:** "Today's deal" / "Flash sale" — `CountdownTimer.tsx` is real and ready; no real campaign/end-time backend exists to feed it. Correctly deferred, per `DNA:PSYCHOLOGY`'s FOMO rule and the audit's own item 6.

---

## Pack 2 — Product Card v4

The single highest-leverage shared surface — rendered on Homepage, Category, Brand, and PDP's own related/recommended rails. Sequenced early because every later pack that renders a `ProductGrid` inherits this pack's result.

### 2.1 — `ProductBadgeSlot` (new, shared component)

1. **Component(s):** New — composes existing `Badge`, `StockBadge`, `CodAvailableBadge`
2. **Files:** New: `packages/storefront-engine/src/components/ProductBadgeSlot.tsx`. Modified: `primitives/ProductCard.tsx`, `packages/storefront-engine/src/index.ts` (export)
3. **Type:** Additive new component + refactor of `ProductCard`'s badge region to use it
4. **Dependencies:** None.
5. **Risk:** Medium — touches the single most-rendered component on the site; a regression here is visible everywhere at once.
6. **Testing:** Snapshot/visual check with zero badges, one badge, and the maximum realistic combination (`StockBadge` + `CodAvailableBadge`) at card and grid density; confirm no layout shift when a badge is conditionally absent.
7. **UX improvement:** Gives merchants a real, ordered, extensible badge region instead of one hardcoded pill — the direct fix for audit item 16, and the seam every future real badge (New/Best-seller/Low-stock, once real data exists) plugs into without another refactor.
8. **Performance impact:** Negligible — a thin layout wrapper around already-rendered components, no new dependency.
9. **Merchant impact:** None required today (the slot renders the same real badges as before); becomes merchant-configurable the moment a real badge-enablement setting is added to Appearance (a future, separate, explicitly-scoped item — not assumed here).

### 2.2 — Card visual identity pass

1. **Component(s):** `primitives/ProductCard.tsx`
2. **Files:** `packages/storefront-engine/src/primitives/ProductCard.tsx`
3. **Type:** Refactor (visual only — corner radius on the image region, border/shadow treatment, hover elevation)
4. **Dependencies:** 2.1 should land first so the badge slot's own layout is finalized before the surrounding card treatment is tuned around it.
5. **Risk:** Medium (same "used everywhere" reasoning as 2.1).
6. **Testing:** Full visual regression across every real call site (`app/page.tsx`, category, brand, PDP rails); confirm `ProductCardSkeleton`'s own dimensions still match the real card after the change (a common, easy-to-miss drift).
7. **UX improvement:** Gives the card a visual identity distinct from an admin data-row (audit item 17) — directly serves `DNA:VISUAL_IDENTITY`'s "premium" and "modern" personality traits.
8. **Performance impact:** None — token/class changes only.
9. **Merchant impact:** None required; automatic, sitewide.

### 2.3 — Honest price-state treatment

1. **Component(s):** `components/PriceBlock.tsx` (empty-state branch only)
2. **Files:** `packages/storefront-engine/src/components/PriceBlock.tsx`
3. **Type:** Refactor (visual only — the `!price` branch's copy/treatment; the real-price branch, discount/savings logic, is completely untouched)
4. **Dependencies:** None.
5. **Risk:** Low — one component, one conditional branch, used everywhere `PriceBlock` is used (card, PDP, cart, checkout) but the change is confined to a state that (per the governing constraint) is currently the *only* state that ever renders in production.
6. **Testing:** Confirm the real-price branch (`price` present) is pixel-for-pixel unchanged; confirm the empty-state copy reads calmly at `sm` (card) and `lg` (PDP) sizes.
7. **UX improvement:** "Price unavailable" reads as a deliberate, intentional state rather than a broken one (audit item 18) — directly serves `DNA:TRUST`'s "transparency about limits" principle.
8. **Performance impact:** None.
9. **Merchant impact:** None; every merchant on this platform is currently in this state, so every merchant's storefront benefits identically and immediately.

---

## Pack 3 — Search Experience

### 3.1 — Restyle the honest "not available yet" dead end

1. **Component(s):** `components/SearchOverlay.tsx` (`submitted` branch only)
2. **Files:** `packages/storefront-engine/src/components/SearchOverlay.tsx`
3. **Type:** Refactor (visual/copy only — real Recent Search and focus-trap behavior untouched)
4. **Dependencies:** None.
5. **Risk:** Low.
6. **Testing:** Confirm the branch still correctly gates on `submitted` state; keyboard/focus-trap regression check (Radix `Dialog` behavior must be unaffected).
7. **UX improvement:** Offers a real next step (jump into Category browsing) instead of a bare "not available yet" sentence (audit item 11) — reduces bounce at the platform's single most damaging honest gap.
8. **Performance impact:** None.
9. **Merchant impact:** None required.

**Named, not built, in this pack:** a real `/search` results page wired to the Gateway's own `/v1/search` route — this remains, as both `MERCHANT_CONVERSION_AUDIT.md` and `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` already concluded, the single highest-ROI *backend/Gateway-wiring* item on the platform, and is out of this UI-only sprint's scope.

---

## Pack 4 — Category Experience

### 4.1 — Visual separation of controls vs. merchandise

1. **Component(s):** `apps/storefront/src/app/categories/[idSlug]/page.tsx` (layout only), `components/FilterSidebar.tsx`/`ProductToolbar.tsx` (surface-tone only)
2. **Files:** `apps/storefront/src/app/categories/[idSlug]/page.tsx`, `packages/storefront-engine/src/components/FilterSidebar.tsx`, `packages/storefront-engine/src/components/ProductToolbar.tsx`
3. **Type:** Refactor (visual only — no prop-shape change to either component)
4. **Dependencies:** None.
5. **Risk:** Low-medium — this page's own real URL-synchronized filter/sort/pagination logic must be provably untouched; a visual-only diff review is the mitigation.
6. **Testing:** Confirm every existing filter/sort/pagination interaction still produces the same real, bookmarkable URL; visual check at 375px (drawer) and desktop (sidebar).
7. **UX improvement:** The shopping surface (grid) reads as distinct from the controls around it (audit item 14) — aids scanning.
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 4.2 — Confirm/strengthen `CategoryBanner`

1. **Component(s):** `components/CategoryBanner.tsx`
2. **Files:** `packages/storefront-engine/src/components/CategoryBanner.tsx`
3. **Type:** Refactor (visual only, minor — the component already renders a real image/description/count correctly; this is a prominence pass, not a rebuild)
4. **Dependencies:** None.
5. **Risk:** Low.
6. **Testing:** Verify with and without a real category image (most categories today have none — the honest no-image state, already correct, must stay correct).
7. **UX improvement:** Minor — slightly stronger visual prominence when a real image exists (audit item 15, narrowed after re-verification: the component's real-data handling was already correct on re-read, only its visual weight needed a pass).
8. **Performance impact:** None — `next/image` usage already present and already `priority`-flagged correctly.
9. **Merchant impact:** A merchant who uploads a category image gets more visible benefit from having done so.

### 4.3 — Brand listing parity (new finding, this pass)

1. **Component(s):** `apps/storefront/src/app/brands/[idSlug]/page.tsx` — adopts `Breadcrumb`, `PromotionBanner`, `RecentlyViewedRail` (all real, already used identically on Category)
2. **Files:** `apps/storefront/src/app/brands/[idSlug]/page.tsx`
3. **Type:** Additive (composes existing components already proven on the Category page — zero new components)
4. **Dependencies:** Pack 2 (card) should be live so the `ProductGrid` this page already renders looks consistent with the rest of the site.
5. **Risk:** Low — this page currently has the least logic of any listing page; adding already-proven components is low-risk composition.
6. **Testing:** Confirm `RecentlyViewedRail`'s `excludeId` behavior isn't needed here (no single product context) and it renders correctly at page scope; confirm breadcrumb schema doesn't duplicate the page's own existing JSON-LD.
7. **UX improvement:** Brings Brand pages up to the same real merchandising bar Category already has — a real, previously-unnoticed inconsistency (`DNA:RULES` #27, consistency over novelty).
8. **Performance impact:** One additional real `getRecommendations()`-class call pattern only if `RecentlyViewedRail` requires one (it does not — it is `localStorage`-only, zero new network cost).
9. **Merchant impact:** Every merchant's Brand pages become materially more complete with no new configuration required.

**Confirmed already satisfied, not carried forward:** real result count (`ProductToolbar`, re-verified this pass). **Named, not built:** price-range/attribute/rating filters — blocked on real backend fields that don't exist (`FilterSidebar.tsx`'s own docblock already states this honestly).

---

## Pack 5 — PDP Polish

Sequenced early in the recommended execution order (§10) — highest audit priority score, and the Buy Box's own mechanics are already real and complete from Beta Experience Pack 1, so this is composition and hierarchy work on a stable foundation, not new plumbing.

### 5.1 — CTA hierarchy (Buy Now dominant)

1. **Component(s):** `apps/storefront/src/app/products/[idSlug]/page.tsx` (button variant/order only — `AddToCartButton`/`BuyNowButton` themselves unchanged)
2. **Files:** `apps/storefront/src/app/products/[idSlug]/page.tsx`
3. **Type:** Refactor (visual/composition only)
4. **Dependencies:** None.
5. **Risk:** Low — no click-handler logic changes, purely which button reads as visually primary.
6. **Testing:** Confirm both buttons remain fully functional (cart add + navigation) exactly as verified live in Pack 1; keyboard-order/focus check.
7. **UX improvement:** Removes the two-equal-weight-button decision friction named in audit item 19 — the single highest priority-score item in the whole audit.
8. **Performance impact:** None.
9. **Merchant impact:** None required; every merchant's PDP benefits immediately.

### 5.2 — `StockBadge` prominence near CTA

1. **Component(s):** `apps/storefront/src/app/products/[idSlug]/page.tsx` (layout only), `components/StockBadge.tsx` (no change)
2. **Files:** `apps/storefront/src/app/products/[idSlug]/page.tsx`
3. **Type:** Refactor (layout only)
4. **Dependencies:** 5.1 (same region of the page).
5. **Risk:** Low.
6. **Testing:** Visual check across `active`/`draft`/other real status values.
7. **UX improvement:** Puts the one real urgency-adjacent signal that already exists where it's actually decision-relevant (audit item 20).
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 5.3 — Visual rhythm bands (Decide / Reassure / Learn)

1. **Component(s):** `apps/storefront/src/app/products/[idSlug]/page.tsx` (spacing/surface-tone only)
2. **Files:** `apps/storefront/src/app/products/[idSlug]/page.tsx`
3. **Type:** Refactor (visual only)
4. **Dependencies:** 5.1, 5.2 (same page, sequenced together as one PR-sized change in practice).
5. **Risk:** Low-medium — the single largest visual diff in this pack, on the platform's highest-stakes page; full before/after screenshot comparison recommended.
6. **Testing:** Full visual regression at 375px and desktop; confirm the sticky info column (`lg:sticky`) and sticky mobile bar are unaffected by the new internal spacing.
7. **UX improvement:** Reduces overwhelm by giving the page a legible structure instead of one undifferentiated column (audit item 21) — directly implements `DNA:PSYCHOLOGY`'s choice-architecture principle and `DNA:RULES` #34.
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 5.4 — "More ways to buy" placeholder refinement

1. **Component(s):** `apps/storefront/src/app/products/[idSlug]/page.tsx` (the Pack-1-built honest placeholder card)
2. **Files:** `apps/storefront/src/app/products/[idSlug]/page.tsx`
3. **Type:** Refactor (visual only — copy and honesty of the state unchanged)
4. **Dependencies:** None.
5. **Risk:** Low.
6. **Testing:** Confirm the copy is unchanged in meaning (still honestly names Bundle/Cross-sell/Frequently-bought-together as not yet real).
7. **UX improvement:** Reads as a deliberate "coming soon" rather than an apologetic empty box (audit item 22).
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 5.5 — Buy Now on the sticky mobile bar

1. **Component(s):** `components/StickyMobileBuyBar.tsx`
2. **Files:** `packages/storefront-engine/src/components/StickyMobileBuyBar.tsx`
3. **Type:** Additive (adds the already-real `BuyNowButton`, exported from `/client`, alongside the existing `AddToCartButton` — no new component)
4. **Dependencies:** None — `BuyNowButton` already exists and is already proven (Pack 1's own live browser verification).
5. **Risk:** Low-medium — this bar is fixed-position and reserves page-bottom space (`pb-20` on the PDP root); adding a second button changes its width/height and must not overlap page content or the desktop breakpoint's absence of this bar.
6. **Testing:** Live mobile-viewport verification (375px) confirming both buttons fit without wrapping awkwardly on a long product name; confirm the reserved bottom padding on the PDP root still fully clears the taller/wider bar.
7. **UX improvement:** The highest-priority mobile-specific gap in the audit (item 23) — Buy Now reaches the one place mobile shoppers spend the most time.
8. **Performance impact:** None — reuses an already-shipped client component.
9. **Merchant impact:** None required; every merchant's mobile PDP benefits immediately.

---

## Pack 6 — Cart Drawer

The audit's own highest-impact area. `CartRecommendations`, built here, is a shared dependency for Pack 7 and Pack 9 — sequenced accordingly in §10.

### 6.1 — `CartRecommendations` (new, shared component)

1. **Component(s):** New — composes existing `getRecommendations()` gateway call and existing `ProductGrid`/`ProductCard`
2. **Files:** New: `packages/storefront-engine/src/cart/CartRecommendations.tsx`. Modified: `packages/storefront-engine/src/client.ts` (export — this is a Client Component, since it renders inside the client-only `CartDrawer`)
3. **Type:** Additive
4. **Dependencies:** Pack 2 (card visual identity) should land first so the rail this renders looks consistent with the rest of the site.
5. **Risk:** Medium — new data fetch inside a previously fetch-free client surface (`CartDrawer` currently reads only `localStorage`); must not block the drawer's own open animation on a slow network response.
6. **Testing:** Verify the drawer opens instantly regardless of this fetch's latency (a loading/skeleton or deferred-render state, never a blocking spinner over the whole drawer); verify with an empty cart (component should render nothing, not an empty rail); verify the `slot`/product-id seeding logic pulls from real cart line `productId`s only.
7. **UX improvement:** Fills the Cart Drawer's own largest dead space with real, relevant products — the audit's single highest-priority-score AOV mechanic (items 25/29).
8. **Performance impact:** One new real network call, client-side, only when the drawer is actually opened (not on every page load) — mitigated by the Gateway's own existing cache layer (`HIT`/`MISS`/`STALE`, already proven in Pack 1's live verification).
9. **Merchant impact:** None required; uses the exact same real recommendation data every merchant's site already has.

### 6.2 — `FreeShippingProgress` (new, shared component) — **contingent**

1. **Component(s):** New
2. **Files:** New: `packages/storefront-engine/src/cart/FreeShippingProgress.tsx`. Modified: `cart/CartDrawer.tsx`, `client.ts` export
3. **Type:** Additive — **explicitly contingent on a small, additive field on the existing `store_appearances` table** (a merchant-configured free-shipping threshold amount), following Beta Experience Pack 1's own established pattern for extending that exact module. **This item does not proceed until that field is confirmed in scope and added** — it is named here, not silently assumed, per G3.
4. **Dependencies:** 6.1 (same drawer region); the Appearance-schema field itself (separate, small backend/Gateway touch, requires explicit sign-off before this item starts).
5. **Risk:** Medium — the one item in this entire roadmap that isn't purely frontend; risk is schedule risk (blocked on a decision), not implementation risk once unblocked.
6. **Testing:** Renders nothing when no threshold is configured (never a fabricated default, per G1); correct progress math against real cart subtotal once a real price exists on a line (today: every cart line is honestly priceless, so this component would render nothing in production until pricing also lands — named explicitly, not hidden).
7. **UX improvement:** A real, evidence-backed AOV mechanic (audit item 24) — but its real-world impact is bounded by the same pricing gap the audit's own governing constraint already named; sequenced last within this pack for exactly that reason.
8. **Performance impact:** Negligible once built.
9. **Merchant impact:** Requires one new Appearance setting (a threshold amount) — the first genuinely new merchant-facing configuration field this roadmap introduces; must be added to the Branding/Appearance workspace UI as part of this item, not left as a backend-only field with no way for a merchant to set it.

### 6.3 — Unify `PromoCodePlaceholder` + `CartSummary`

1. **Component(s):** `cart/CartDrawer.tsx` (layout only), `cart/PromoCodePlaceholder.tsx`/`cart/CartSummary.tsx` (visual only, no logic change to either)
2. **Files:** `packages/storefront-engine/src/cart/CartDrawer.tsx`, `packages/storefront-engine/src/cart/PromoCodePlaceholder.tsx`, `packages/storefront-engine/src/cart/CartSummary.tsx`
3. **Type:** Refactor (visual only)
4. **Dependencies:** None.
5. **Risk:** Low — both components' own real logic (honest coupon-deferral copy, honest subtotal-or-"calculated at checkout" logic) is untouched.
6. **Testing:** Confirm both real states (with and without a known-price line) still render correctly inside the new shared visual frame.
7. **UX improvement:** Reads as one coherent "here's your total" narrative instead of two unrelated system messages (audit item 26).
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 6.4 — Delivery-estimate reassurance line

1. **Component(s):** `cart/CartDrawer.tsx` (new line), reuses existing `CourierBadge`
2. **Files:** `packages/storefront-engine/src/cart/CartDrawer.tsx`
3. **Type:** Additive (reuses an existing component; no new one)
4. **Dependencies:** None.
5. **Risk:** Low — copy must stay genuinely generic/non-committal, matching the FAQ disclosure's own established honest-generic pattern; a reviewer must confirm the copy never implies a specific, unverified delivery promise.
6. **Testing:** Copy review against G1 specifically.
7. **UX improvement:** A small, real trust/confidence addition at the exact moment a shopper is deciding to check out (audit item 28).
8. **Performance impact:** None.
9. **Merchant impact:** None.

---

## Pack 7 — Cart Page

### 7.1 — Reuse `CartRecommendations`

1. **Component(s):** `apps/storefront/src/app/cart/page.tsx` (consumes Pack 6's new component)
2. **Files:** `apps/storefront/src/app/cart/page.tsx`
3. **Type:** Additive
4. **Dependencies:** Pack 6.1 must be complete and merged first — this item does not reimplement the rail.
5. **Risk:** Low.
6. **Testing:** Confirm identical behavior to the Drawer's own instance (G2 — same component, same data pathway).
7. **UX improvement:** AOV mechanic extended to the full-page cart fallback, per audit items 25/29.
8. **Performance impact:** Same as 6.1 — one real call, client-side, on this page's own mount.
9. **Merchant impact:** None required.

### 7.2 — Empty-cart state: real Trending rail

1. **Component(s):** `apps/storefront/src/app/cart/page.tsx` (empty-state branch)
2. **Files:** `apps/storefront/src/app/cart/page.tsx`
3. **Type:** Additive (reuses the same real `getRecommendations({slot:'trending'})` pattern already used on the Homepage — not a new data pathway)
4. **Dependencies:** None.
5. **Risk:** Low.
6. **Testing:** Verify the empty-cart state still shows correctly when the recommendation call itself returns nothing (an honest empty state nested inside another).
7. **UX improvement:** Recovers a genuine dead end into a real discovery opportunity (audit item 30).
8. **Performance impact:** One additional real call, only on the empty-cart page state.
9. **Merchant impact:** None required.

---

## Pack 8 — Checkout Experience

Deliberately sequenced later (§10) — the platform's single highest-stakes, highest-trust page, and the brief's own explicit "do not change checkout logic" boundary means every item here must be provably presentation-only, verified against a stable, already-proven set of visual patterns from earlier packs before being applied to this page.

### 8.1 — Section-complete visual affordance

1. **Component(s):** `checkout/CheckoutForm.tsx` (presentation only — reads the exact same `errors`/field-state the real `validate()` function already computes)
2. **Files:** `packages/storefront-engine/src/checkout/CheckoutForm.tsx`
3. **Type:** Refactor (visual only — zero change to `validate()`, `handleSubmit`, or any field's business rule)
4. **Dependencies:** None.
5. **Risk:** Medium — this is the platform's real order-placing form; even a presentation-only change requires full regression testing of the actual submission flow, not just a visual diff.
6. **Testing:** Full re-run of `CheckoutForm.test.tsx`'s existing real test suite (must remain green, unmodified in assertions); live browser re-verification of a real, successful order placement end-to-end (matching Beta Experience Pack 1's own established verification bar) after the visual change lands.
7. **UX improvement:** Visible progress reassurance without a true multi-step wizard (audit item 31) — reduces perceived effort on a long form.
8. **Performance impact:** None — no new fetch, computed from state already in memory.
9. **Merchant impact:** None; the real backend contract this form submits against is completely unchanged.

### 8.2 — Trust-row reuse beside Payment

1. **Component(s):** `checkout/CheckoutForm.tsx` (composition only), reuses existing `PaymentMethodsRow`/`CourierBadge`
2. **Files:** `packages/storefront-engine/src/checkout/CheckoutForm.tsx`
3. **Type:** Additive (reuses existing components — no new one, per G2)
4. **Dependencies:** None.
5. **Risk:** Low-medium (same "real order form" caution as 8.1, but a smaller, additive change).
6. **Testing:** Same regression bar as 8.1 — confirm no interference with the real `PaymentMethodSelector`'s own radiogroup behavior.
7. **UX improvement:** Reinforces trust at the exact moment of payment-method decision (audit item 32).
8. **Performance impact:** None — reuses already-rendered-elsewhere components.
9. **Merchant impact:** None.

### 8.3 — Mobile sticky/collapsible order-total bar

1. **Component(s):** New, small — a thin, mobile-only summary bar; composes the existing `CartSummary`'s own already-computed real total
2. **Files:** New: a small addition inside `packages/storefront-engine/src/checkout/CheckoutForm.tsx` (a mobile-only fixed-position summary strip reading the same `cart.lines` state already in scope — likely does not warrant a fully separate exported component, but if it does, it stays inside the `checkout/` slice, not a new top-level primitive)
3. **Type:** Additive
4. **Dependencies:** None, but sequenced after 8.1/8.2 land and are verified stable.
5. **Risk:** Medium — a new fixed-position element on the checkout page must not overlap the real submit button or any real form field at any viewport height, and must not interfere with `CheckoutForm`'s own existing sticky desktop order-summary card (`lg:sticky`) at the breakpoint boundary.
6. **Testing:** Live mobile-viewport verification across the full form scroll length; confirm the desktop sticky card is completely unaffected (this addition is mobile-only).
7. **UX improvement:** Directly answers Baymard Institute's own published finding that an invisible running total is a top-10 real cause of mobile checkout abandonment (audit item 33) — the single highest-value item in this pack.
8. **Performance impact:** None — reads state already in memory, no new fetch.
9. **Merchant impact:** None; the real total shown is exactly what `CartSummary` already computes.

---

## Pack 9 — Success Experience

### 9.1 — Celebratory visual treatment

1. **Component(s):** `apps/storefront/src/app/checkout/success/page.tsx`
2. **Files:** `apps/storefront/src/app/checkout/success/page.tsx`
3. **Type:** Refactor (visual only — CSS accent wash behind the existing real checkmark; the real `sessionStorage` read, the Strict-Mode `hasReadRef` fix, and all real order/payment rendering are completely untouched)
4. **Dependencies:** None.
5. **Risk:** Low-medium — this page has a documented, subtle Strict-Mode bug fix already in place (`hasReadRef`); any edit here must be reviewed specifically to confirm that fix's own logic is untouched, not just visually re-verified.
6. **Testing:** Full live re-verification of a real order placement reaching this page correctly (same bar as 8.1); confirm the "no recent order" and payment-failure branches are visually unaffected in a way that would misrepresent their seriousness (a failure state must never receive the same celebratory treatment as a success state).
7. **UX improvement:** Gives the platform's one guaranteed positive-emotion moment real visual weight (audit items 34, `DNA:EMOTION`'s "success"/"reward" stage).
8. **Performance impact:** None — CSS only.
9. **Merchant impact:** None.

### 9.2 — Reuse `CartRecommendations` below the receipt

1. **Component(s):** `apps/storefront/src/app/checkout/success/page.tsx` (consumes Pack 6's component)
2. **Files:** `apps/storefront/src/app/checkout/success/page.tsx`
3. **Type:** Additive
4. **Dependencies:** Pack 6.1 complete.
5. **Risk:** Low.
6. **Testing:** Confirm rendering only in the real-order-found branch, never in the "no recent order" or failure branches.
7. **UX improvement:** Converts the platform's highest-goodwill moment into a real re-engagement opportunity (audit item 35).
8. **Performance impact:** Same as 6.1.
9. **Merchant impact:** None required.

---

## Pack 10 — Micro Interactions

Sitewide chrome and motion polish, sequenced after the cart/checkout interaction patterns above are stable, since several items here touch the same header/cart affordances those packs also touch.

### 10.1 — Cart icon pulse on add

1. **Component(s):** `components/StoreHeader.tsx` (cart icon button)
2. **Files:** `packages/storefront-engine/src/components/StoreHeader.tsx`
3. **Type:** Refactor (CSS transition only, keyed off the existing real `activeItemCount` state — no new state)
4. **Dependencies:** None.
5. **Risk:** Low.
6. **Testing:** Confirm `prefers-reduced-motion` disables the pulse while the badge count itself still updates instantly; confirm no animation runs on initial page load (only on a real count change).
7. **UX improvement:** Header-level acknowledgment reinforcing the drawer's own open animation (audit item 8).
8. **Performance impact:** None — CSS transform only.
9. **Merchant impact:** None.

### 10.2 — Hover/press tactile-state audit

1. **Component(s):** Cross-cutting — every primary interactive element touched by Packs 1–9 (`ProductCard`, both Buy Box CTAs, Cart line actions, Checkout submit)
2. **Files:** No new files expected — this is a verification pass across files already modified by earlier packs, correcting any inconsistent `duration-fast` usage found.
3. **Type:** Refactor (verification + spot-fixes only)
4. **Dependencies:** Packs 1–9 complete.
5. **Risk:** Low.
6. **Testing:** Manual interaction sweep confirming every button/card in scope has a real, consistent hover and press state.
7. **UX improvement:** Consistency itself is a trust signal (`DNA:TRUST`) — closes any drift introduced across nine packs of independent visual work.
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 10.3 — Reserved header slot for Wishlist/Compare/Language

1. **Component(s):** `components/StoreHeader.tsx` (layout only — no new icons rendered, per G1: nothing is added that isn't real yet)
2. **Files:** `packages/storefront-engine/src/components/StoreHeader.tsx`
3. **Type:** Additive (a reserved, currently-empty layout region, not a visible change)
4. **Dependencies:** None.
5. **Risk:** Low.
6. **Testing:** Confirm the reservation produces zero visible difference today (no empty box, no phantom spacing) — purely a future-proofing layout decision, verified by its own absence of visible effect.
7. **UX improvement:** None today — this item exists so that when Wishlist/Compare/Language become real, they drop into a designed space rather than reflowing the header (audit item 9, `DNA:RULES` #28's extensibility principle).
8. **Performance impact:** None.
9. **Merchant impact:** None today.

### 10.4 — `prefers-reduced-motion` audit

1. **Component(s):** Cross-cutting — every new motion introduced by Packs 1, 5, 6, 9, 10.1
2. **Files:** Verification pass; spot-fixes only where a gap is found.
3. **Type:** Refactor (verification)
4. **Dependencies:** Packs 1–9 and 10.1 complete.
5. **Risk:** Low.
6. **Testing:** OS-level reduced-motion toggle re-test of every new animated element introduced this sprint.
7. **UX improvement:** Closes the loop on `DNA:MOTION` rule #9 across everything built this roadmap.
8. **Performance impact:** None.
9. **Merchant impact:** None.

---

## Pack 11 — Accessibility

### 11.1 — 44×44px tap-target audit

1. **Component(s):** Cross-cutting — header icon buttons, `ProductQuickActions`, filter chips, badge-slot interactive elements (if any become interactive later)
2. **Files:** Verification pass; spot-fixes in `StoreHeader.tsx`, `ProductQuickActions.tsx`, `FilterSidebar.tsx` where a real gap is found.
3. **Type:** Refactor (verification + targeted fixes)
4. **Dependencies:** None — can run in parallel with early packs as a baseline, then re-run after Packs 1–10 for full coverage.
5. **Risk:** Low.
6. **Testing:** Measured audit (DevTools or a real device) against every interactive element in scope.
7. **UX improvement:** Serves both accessibility and raw mobile usability identically (`DNA:ACCESSIBILITY`'s own stated reasoning) — audit item 36.
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 11.2 — Keyboard/focus-visible audit on new components

1. **Component(s):** Every new component from Packs 2, 6 (`ProductBadgeSlot`, `CartRecommendations`, `FreeShippingProgress`)
2. **Files:** Verification pass on the files listed in those packs.
3. **Type:** Refactor (verification + fixes)
4. **Dependencies:** Packs 2 and 6 complete.
5. **Risk:** Low.
6. **Testing:** Full keyboard-only navigation pass through every new surface; confirm focus-visible rings match the platform's existing `focus-visible:ring-2 focus-visible:ring-focus` convention exactly (no new, inconsistent focus style introduced).
7. **UX improvement:** Baseline accessibility compliance for genuinely new interactive surfaces, never assumed correct by default.
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 11.3 — Alt-text audit on new imagery

1. **Component(s):** `Hero.tsx` (if 1.1 introduces any image use — today it does not), `CategoryBanner.tsx` (already correctly `alt=""` as decorative background), mega-menu thumbnails (Pack 1.7, new)
2. **Files:** `packages/storefront-engine/src/components/StoreHeader.tsx` (verify/fix), `CategoryBanner.tsx` (confirm, no change expected)
3. **Type:** Refactor (verification + fix where needed)
4. **Dependencies:** Pack 1.7 complete.
5. **Risk:** Low.
6. **Testing:** Screen-reader spot check on the mega-menu specifically (the one genuinely new image usage in this roadmap).
7. **UX improvement:** Correct alt text also directly serves SEO indexing (`DNA:ACCESSIBILITY`'s own stated dual benefit).
8. **Performance impact:** None.
9. **Merchant impact:** None.

### 11.4 — WCAG AA contrast check on new visual treatments

1. **Component(s):** Pack 1's Hero/announcement-bar treatment, Pack 2's badge slot, Pack 5's CTA-hierarchy colors
2. **Files:** Verification pass across the files those packs modified.
3. **Type:** Refactor (verification + fix where a contrast failure is found)
4. **Dependencies:** Packs 1, 2, 5 complete.
5. **Risk:** Low-medium — a merchant-set brand color (Pack 1.1/1.6 consume `primaryColor`/`accentColor` directly) could theoretically produce a low-contrast combination the default token palette never would; this item must define the fallback behavior (a computed contrast-safe text color, or a documented merchant-guidance note in Appearance) rather than silently shipping an inaccessible combination for some merchants and not others.
6. **Testing:** Automated contrast check (axe or equivalent) against the real, currently-configured branding, plus at least one deliberately extreme (very light) brand color to confirm the fallback behavior actually engages.
7. **UX improvement:** Prevents a real, merchant-specific accessibility regression that this roadmap's own Pack 1 could otherwise introduce.
8. **Performance impact:** None.
9. **Merchant impact:** A merchant with a very light brand color may see a computed adjustment to text-on-brand-color contrast — worth a one-line explanation in the Appearance workspace if this engages, so it never looks like an unexplained platform override of their choice.

---

## Pack 12 — Performance Polish

### 12.1 — `generateStaticParams` for top products

1. **Component(s):** `apps/storefront/src/app/products/[idSlug]/page.tsx`
2. **Files:** `apps/storefront/src/app/products/[idSlug]/page.tsx`
3. **Type:** Additive (a new exported `generateStaticParams`, sourcing the homepage's own already-real Featured/Trending product ids — no new data source)
4. **Dependencies:** None — genuinely independent of every other pack; can run first (see §10).
5. **Risk:** Low — additive Next.js convention; a product not in the pre-rendered set still renders correctly via the existing on-demand ISR path, per `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md` §1.2's own recommendation.
6. **Testing:** Confirm `next build` output shows the expected pre-rendered paths; confirm a non-pre-rendered product id still resolves correctly (no regression to the fallback path).
7. **UX improvement:** Removes the real "cold-start tax" on a meaningful share of first-time product-page hits (`STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md` §1.2).
8. **Performance impact:** Positive — the explicit point of this item; reduces first-hit latency for pre-rendered paths, with a small, one-time build-time cost.
9. **Merchant impact:** None; automatic.

### 12.2 — Image `sizes`/placeholder tuning

1. **Component(s):** `Hero.tsx`, `CategoryBanner.tsx`, `ProductCard.tsx`, mega-menu thumbnails (Pack 1.7)
2. **Files:** Same files as Packs 1 and 2 — this is a verification/tuning pass on `next/image` usages those packs already touch, not new files.
3. **Type:** Refactor (attribute tuning only)
4. **Dependencies:** Packs 1 and 2 complete.
5. **Risk:** Low.
6. **Testing:** Real-device/throttled-network check confirming images load at an appropriate resolution per breakpoint, not over-fetched.
7. **UX improvement:** Indirect — faster perceived load, especially on mobile/metered connections (`DNA:MOBILE`, `DNA:PERFORMANCE`).
8. **Performance impact:** Positive — closes a named, real gap (`STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md` §3.2).
9. **Merchant impact:** None.

### 12.3 — Bundle-size verification

1. **Component(s):** All new components from Packs 2 and 6
2. **Files:** N/A — a measurement pass, not a code change, unless a regression is found
3. **Type:** Verification
4. **Dependencies:** Packs 2 and 6 complete.
5. **Risk:** Low.
6. **Testing:** Compare `next build`'s own First Load JS output against Beta Experience Pack 1's confirmed sub-200KB baseline; confirm each new component is under the ~1KB-gzipped estimate stated in its own pack entry.
7. **UX improvement:** None directly — a guardrail confirming other improvements didn't cost more than budgeted.
8. **Performance impact:** This item's entire purpose — catches a regression before it ships, per G6.
9. **Merchant impact:** None.

### 12.4 — Final CLS/layout-shift verification

1. **Component(s):** Every page touched by Packs 1–9
2. **Files:** N/A — a measurement pass across the full site
3. **Type:** Verification
4. **Dependencies:** All other packs complete — this is deliberately the last item in the entire roadmap.
5. **Risk:** Low (verification only), but its *findings* could surface medium-risk follow-up fixes if a regression is found.
6. **Testing:** Lighthouse/Core Web Vitals pass on Homepage, Category, PDP, Cart, Checkout, Success at both mobile and desktop viewports.
7. **UX improvement:** None directly — confirms the cumulative result of this entire roadmap holds the platform's own existing Core Web Vitals bar, per G4/`DNA:PERFORMANCE`.
8. **Performance impact:** This item's entire purpose.
9. **Merchant impact:** None directly — protects every merchant's existing storefront performance.

---

## 9. No Duplicated Components — Confirmation

Every new component introduced anywhere in this roadmap, and why it isn't a duplicate:

| New component | Composes (never reimplements) | Why it's not a duplicate |
|---|---|---|
| `ProductBadgeSlot` | `Badge`, `StockBadge`, `CodAvailableBadge` | A layout wrapper only — no badge's own rendering logic is reimplemented |
| `CartRecommendations` | `getRecommendations()` (already the one shared recommendation pathway used by Homepage/PDP/Category), `ProductGrid`/`ProductCard` | Same data call, same rendering components, consumed identically by Cart Drawer, Cart Page, and Success — one implementation, three consumers |
| `FreeShippingProgress` | Real cart subtotal (`CartSummary`'s own computation) + a new Appearance field | Genuinely new capability, not a variant of an existing component |

No other pack introduces a new component. Every other item in this roadmap modifies an existing component in place or composes existing components into a page that didn't use them yet (Pack 4.3's Brand-page parity, Pack 7's and Pack 9's reuse of `CartRecommendations`, Pack 8.2's reuse of `PaymentMethodsRow`/`CourierBadge`).

---

## 10. Recommended Execution Order

Pack numbers and names are unchanged from the brief's own structure; the order below sequences them by real dependency and regression risk, not by their numeric labels.

1. **Pack 12, item 12.1 only** (`generateStaticParams`) — zero visual risk, fully independent, real performance win banked immediately.
2. **Pack 5** (PDP Polish) — highest audit priority score, composition-only changes to an already-real, already-proven Buy Box.
3. **Pack 2** (Product Card v4) — foundational; every later pack that renders a `ProductGrid` inherits this.
4. **Pack 3** (Search Experience) — small, fully independent, no reason to delay.
5. **Pack 4** (Category Experience) — depends on Pack 2's card being finished for visual coherence.
6. **Pack 1** (Homepage Hierarchy) — depends on Pack 2 (rail card) for the same reason as Pack 4; the largest single-page visual diff, sequenced once the card and category patterns are already proven stable.
7. **Pack 6** (Cart Drawer) — introduces `CartRecommendations`, a shared dependency for the next two packs.
8. **Pack 7** (Cart Page) — reuses Pack 6's new component.
9. **Pack 9** (Success Experience) — reuses Pack 6's new component; sequenced after Pack 7 confirms the component is stable in a second real context first.
10. **Pack 8** (Checkout Experience) — the platform's highest-stakes page, deliberately last among the functional packs so every visual pattern it reuses (trust rows, section states) has already been proven safe elsewhere first.
11. **Pack 10** (Micro Interactions) — sitewide chrome and motion polish, naturally last since it audits/polishes interactions across everything built above.
12. **Pack 11** (Accessibility) — items 11.1 can start as an early baseline in parallel with step 2 onward; the full pass (11.2–11.4) runs after the packs it audits are complete.
13. **Pack 12, remaining items** (12.2–12.4) — necessarily last; 12.4 in particular verifies the cumulative result of the entire roadmap and cannot run meaningfully before everything else has landed.

Steps 2–6 and 7–9 are each internally ordered by hard dependency; steps within the same numbered stage that don't depend on each other (e.g., Pack 3 relative to Pack 2) may run in parallel if more than one implementation stream is available.

---

## Awaiting approval

Per the brief's own instruction, no code has been written. This roadmap is the complete deliverable for this planning pass. Implementation begins pack-by-pack, in the order above, only once this roadmap is approved.
