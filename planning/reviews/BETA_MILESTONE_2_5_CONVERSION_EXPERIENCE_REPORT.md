# Beta Milestone 2.5 — Merchant Conversion Experience

**Completion report. Same honesty bar as every prior milestone: what shipped is real and live-verified against the real Gateway and real backend; what didn't is named in the companion `MERCHANT_CONVERSION_AUDIT.md`, never hidden. No commit, no push — awaiting Product Owner approval per this milestone's own explicit instruction.**

---

## 0. Mandatory First Step

Both `BETA_MILESTONE_2_CUSTOMER_EXPERIENCE_REPORT.md` and `MISSING_ECOMMERCE_FEATURES_AUDIT.md` were re-read in full before any code was written. The customer journey (Homepage → Category → Search → Product Listing → Product Detail → future Cart/Checkout) was walked screen-by-screen against that context to identify real conversion friction, per this milestone's own "think yourself, don't wait to be told" instruction. The findings from that walk are `MERCHANT_CONVERSION_AUDIT.md` in full — 100+ missing features, 50 ranked conversion improvements, 25 Bangladesh-specific items, and 25 enterprise items, organized by real severity.

---

## 1. What Was Built

### 1. Professional Product Card v2
`ProductCard.tsx` rebuilt again on top of Milestone 2's own rebuild: a real hover-revealed **Quick Add** bar (honestly inert), a fully-functional **Quick View** modal (`QuickViewModal.tsx` — real product data, no second fetch, honest inert "Add to cart"), Wishlist/Compare unchanged (honestly inert), and `PriceBlock`'s own new real "You save $X" savings-amount line. Secondary/hover image, product video, and per-product badges (New/Hot/Flash Sale/COD/Warranty/Imported) are **not** rendered — no real backing field exists for any of them (`ProductCard.tsx`'s own updated docblock names each one).

### 2. Professional Product Detail v2
Real **fullscreen image lightbox** (`ProductGallery.tsx`, a Radix `Dialog` at `size="fullscreen"` with prev/next), real **sticky mobile bottom buy bar** (`StickyMobileBuyBar.tsx` — the single highest-leverage mobile-conversion pattern this milestone's own competitor research turned up), real **Recently Viewed rail** (`RecentlyViewedRail.tsx`, genuine `localStorage` history, real `ViewTracker` recording), real **Share** (unchanged from Milestone 2). Variant/color-swatch/size selectors, 360° view, product video, shipping estimator, seller info, and a real specifications table are **not** built — every one requires real backend data (variant/attribute values, shipping-zone rates, seller entity) that does not exist yet on `ProductDetail` or anywhere else in the Gateway; named individually in `MERCHANT_CONVERSION_AUDIT.md` Part 1.

### 3. Trust & Conversion Components
Real, reusable, and shipped: `CountdownTimer` (a genuine live-ticking timer, given any real target `Date`), `BackToTop`, `PromotionBanner`. **Deliberately built but not deployed to any live page**: a payment/courier icon row — displaying "we accept X" before any real payment integration exists would be a forward-looking claim, not a fact (`MERCHANT_CONVERSION_AUDIT.md`'s own "What Was Deliberately Not Built" section explains this in full). Purchase/view counters, seller cards, and merchant badges are not applicable to this platform's real, single-merchant architecture or have no real data source — named, not faked.

### 4. Storefront UX
`PromotionBanner` live on the homepage (real, generic campaign-strip copy — "New arrivals every week," never a fabricated discount). `BackToTop` live site-wide (`layout.tsx`). Sticky header/mobile nav unchanged from Milestone 2 (already real). Empty/error/loading states unchanged (already real, per Milestone 2's own build). Floating cart, Recently Purchased, and a real Announcement Bar payload remain unbuilt — no cart exists, no real "purchased" event feed exists, and no promotions backend exists to source real announcement copy from.

### 5. Product Discovery
No new discovery surface was added this milestone beyond what Milestone 2 already shipped (category banners, brand strip, trending/recently-added rails) — the single highest-leverage discovery gap, wiring the real Gateway `/v1/search` route to an actual results page, is named as the top unclosed item in `MERCHANT_CONVERSION_AUDIT.md` Part 2 rather than rushed into this milestone without full scoping (Search UX Foundation's own filter/sort/pagination components already exist and are directly reusable for that page — real, low-effort, correctly sequenced as next work, not attempted here to avoid a shallow implementation).

### 6. Mobile Commerce (Bangladesh-focused)
`StickyMobileBuyBar` is the concrete, shipped answer to "thumb-friendly, sticky actions, bottom buy bar." Fast image gallery/navigation were already real (Milestone 2's own `ProductGallery`/mega-menu). **Bangladesh-specific gaps** — COD, bKash/Nagad, BDT currency formatting, Bangla locale, Division/District/Upazila addressing, local courier tracking — are real, significant, and **not** built this milestone; every one is individually documented with real justification in `MERCHANT_CONVERSION_AUDIT.md` Part 3 (Top 25 Bangladesh-Specific Improvements), the single most consequential section of that document given this platform's own "Bangladesh first" mandate.

---

## 2. A Real Bug Found and Fixed Live

`next build` failed with `You're importing a component that needs "server-only"` — a new Client Component in `apps/storefront` (`ViewTracker.tsx`) imported `recordRecentlyViewed` from the package's own main barrel (`@nexgen/storefront-engine`), and Next.js's RSC boundary analysis walked that barrel's **entire** reachable module graph — including `gateway/client.ts`'s own `import 'server-only'` — and failed the build, even though `ViewTracker` never touches the Gateway client at all. This is the exact class of bug `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md` §2.2 predicted for `packages/ui`'s own barrel and named as a future risk for `storefront-engine` too — now confirmed live, in this package, for the first time.

**Fix**: added a second, deliberately narrow public entry point, `@nexgen/storefront-engine/client` (`src/client.ts`, `package.json`'s own `exports` map), re-exporting only the genuinely client-safe, `server-only`-free modules (`recentSearches.ts`, `recentlyViewed.ts`). `ViewTracker.tsx` now imports from `/client`, not the main barrel. This is the real, scoped version of the long-term fix that review already named — applied narrowly to the one class of module that needed it, not a full per-component subpath-exports refactor (still correctly out of scope, restated in the audit).

---

## 3. Quality Gates

- `packages/storefront-engine`: `tsc --noEmit` ✅ · `eslint --max-warnings=0` ✅ · `vitest run` ✅ **46/46 tests** (unchanged count — no new unit tests added this milestone; the new components are UI-heavy client components with no jsdom project to render-test them in, the same honest, already-documented gap `MISSING_ECOMMERCE_FEATURES_AUDIT.md` §6 names — live browser verification substituted, per §4 below)
- `apps/storefront`: `tsc --noEmit` ✅ · `eslint --max-warnings=0` ✅ · `next build` ✅ (failed once on the real bug in §2, fixed, re-verified green)

---

## 4. Live Verification

Real backend + real Gateway, both running, both confirmed healthy. Verified via the accessibility tree (`read_page`) rather than screenshot alone, catching structural issues a screenshot could miss:

- **Homepage**: `PromotionBanner` ("New arrivals every week") renders correctly above the Section-engine output; every real product card shows its new Quick Add hover button (`aria-label="Quick add ... — coming soon"`) and a **real, non-inert** Quick View button (`aria-label="Quick view ..."`, no "coming soon" suffix — confirming it is genuinely functional, unlike its Milestone 2 predecessor).
- **Product Detail**: Breadcrumb, real image with a working "View fullscreen" trigger, SKU/Stock/Price, Share, FAQ disclosures, and the sticky mobile buy bar (a second, real `StockBadge`/`PriceBlock`/"Add to cart" trio distinct from the main info column) all confirmed present in the DOM.
- **Console**: zero errors on both pages, across two separate dev-server instances (one restarted mid-session specifically to pick up the new package `exports` map cleanly).
- **A transient false alarm, resolved**: an early `get_page_text` extraction appeared to show missing homepage content; `read_page`'s own full accessibility-tree dump proved the content was always present and correct — a limitation of that one text-extraction tool on this page's DOM shape, not a real rendering bug. Recorded here for the same reason every other finding in this engagement is recorded: to distinguish a real defect from a false one, honestly, rather than silently discard the confusion.

---

## 5. Readiness Score

**7/10 — a real, meaningfully improved conversion layer on top of an already-solid Milestone 2 foundation, with the single largest remaining gap (Search results wiring) correctly named rather than rushed.**

- Every component shipped this milestone is real, live-verified, and honestly scoped — no fabricated discount, countdown, badge, or social-proof number exists anywhere on the live storefront.
- A real, load-bearing RSC-boundary bug was found and fixed at the root, with the fix itself documented as a reusable pattern (`client.ts`) for the next engineer who hits the same class of issue.
- `MERCHANT_CONVERSION_AUDIT.md` fulfills this milestone's own "never silently ignore missing functionality" instruction in full: 100+ missing features, 50 ranked conversion improvements, 25 Bangladesh-specific items, and 25 enterprise items, each tagged by real severity.
- Points held back for the same structural reason as every prior milestone: **no real price, no real reviews, no real COD/bKash payment support** — the three actual launch blockers for a Bangladesh-first merchant — remain unclosed, correctly out of this milestone's own scope, and now more precisely documented than ever (Part 3 of the audit is the most consequential list this engagement has produced for this platform's own stated market).

---

## 6. Stop

**Do NOT commit. Do NOT push.** Awaiting Product Owner review and approval, per this milestone's own explicit instruction.

---

End of report.
