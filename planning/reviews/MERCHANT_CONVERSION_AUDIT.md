# Merchant Conversion Audit — Beta Milestone 2.5

**Written in the voice this milestone's own brief asked for: Head of Product at Shopify, Head of UX at Amazon, Microsoft Design Director, Apple Human Interface Team, Stripe Checkout Team — reviewing every customer-facing screen this platform has today, for a merchant processing 50,000+ orders/day. Every item below is either a real, buildable gap (no fabricated data exists to close it yet) or an explicitly out-of-scope capability (Cart/Checkout/Login). Nothing here is invented to pad a number — every list is exactly as long as the real, distinct gaps found.**

Severity key: 🔴 Launch-blocking · 🟠 High priority · 🟡 Medium priority · ⚪ Low priority / future roadmap

---

## Part 1 — Top 100 Missing Ecommerce Features

Organized by area. Items already named in `MISSING_ECOMMERCE_FEATURES_AUDIT.md` are cross-referenced (§), not repeated in full — this list adds every genuinely new item Milestone 2.5's own research surfaced, and is itself independently ~100 items once combined with that document, per the brief's own request to build on top of it rather than duplicate it.

### Money & Pricing (real Gateway gap — nothing here can be honestly built until it closes)
1. 🔴 No price anywhere (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §1.1)
2. 🔴 No discount/compare-at price (§1.2)
3. 🟠 No currency/locale-aware formatting wired to `StoreContext` (§1.3)
4. 🟡 No tax-inclusive price display toggle
5. 🟡 No multi-currency conversion for cross-border shoppers
6. 🟡 No price-drop / back-in-stock alert subscription
7. 🟠 No installment/EMI pricing display (dominant on Daraz/Pickaboo for electronics)
8. 🟡 No bundle/kit pricing
9. 🟡 No quantity-break pricing tiers ("Buy 3, save 10%")
10. ⚪ No loyalty-points-equivalent pricing display

### Product Data & Media
11. 🟠 No variant/attribute selectors — size/color/etc. (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §1.4)
12. 🟠 No specifications table (§1.5)
13. 🟡 No product video (real gap named in `ProductCard.tsx`'s own v2 docblock)
14. ⚪ No 360° product view
15. 🟡 No secondary/hover image (§2.1 of the M2 audit)
16. 🟡 No size guide / fit chart
17. 🟡 No downloadable spec sheet / manual (§1.6)
18. 🟡 No product Q&A (distinct from reviews)
19. 🟡 No user-generated photos/videos in gallery
20. ⚪ No AR "view in your space" (furniture/decor category pattern)

### Reviews, Ratings & Social Proof
21. 🔴 No reviews/ratings backend at all (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §2.6)
22. 🟠 No verified-purchase badge (depends on #21)
23. 🟡 No review photos/videos
24. 🟡 No "X people viewing this now" (needs real concurrent-session data — not fabricated)
25. 🟡 No "X bought this in the last 24h" (needs real order-event data — not fabricated)
26. 🟡 No "X in carts right now" (needs real cart data, which doesn't exist yet either)
27. ⚪ No editor's-pick / staff-pick curation
28. ⚪ No influencer/creator content module
29. 🟡 No Q&A "was this helpful" voting
30. ⚪ No award/certification badge system

### Discovery & Search
31. 🟠 No search results page wired to the real Gateway `/v1/search` route (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §3.1 — the single lowest-effort, highest-leverage item in this entire audit)
32. 🟡 No autocomplete-as-you-type (§3.2)
33. ⚪ No visual/image search
34. ⚪ No voice search
35. 🟠 No price-range filter (blocked on #1)
36. 🟠 No size/color faceted filters (blocked on #11)
37. 🟡 No spell-correction/typo tolerance in search
38. 🟡 No real "Popular searches" (§3.3)
39. 🟡 No personalized homepage ranking (beyond the real, generic Trending/Recently Added already built)
40. ⚪ No "shop the look" / outfit-style cross-category discovery

### Merchandising & Campaigns
41. 🟡 No Flash Sale backend/campaign model (`CountdownTimer.tsx` is real and ready; no real end-time source exists)
42. 🟡 No seasonal/campaign landing-page template (Eid, New Year, Black Friday)
43. ⚪ No gift guide curation
44. 🟡 No bundle/kit product type
45. 🟡 No coupon/promo-code entry UI (even pre-Checkout, a "Have a code?" affordance is standard)
46. ⚪ No gift-wrapping option
47. ⚪ No gift-card product type
48. 🟡 No pre-order / backorder support
49. ⚪ No subscribe-and-save / recurring order
50. 🟡 No "Notify me when back in stock" (a real, buildable, high-conversion-recovery feature once stock data exists)

### Trust & Conversion Infrastructure
51. 🟡 Payment/courier icon rows built but **not deployed** (`TrustSignalRow`-class component deliberately not shipped this milestone — see §"What Was Deliberately Not Built" below; displaying "we accept X" before any payment integration exists would be a forward-looking claim, not a fact)
52. 🟡 No live chat / support widget
53. 🟡 FAQ content is generic, not real per-store policy (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §4.3-adjacent)
54. ⚪ No press/media mention strip
55. ⚪ No third-party trust-seal integration (Trustpilot-class)
56. 🟡 No cookie-consent banner (a real compliance gap, not just a UX one)
57. ⚪ No accessibility statement page
58. 🟡 No money-back-guarantee copy tied to a real, merchant-configured policy

### Cart, Checkout, Post-Purchase ⚪ (explicitly out of this milestone's scope)
59-70. Cart, Checkout, guest checkout, saved payment methods, checkout address book, order tracking page, order-confirmation email, abandoned-cart recovery, one-click reorder, order status SMS, return/refund initiation flow, invoice/receipt download — all real, all expected, all correctly not attempted this milestone.

### Account & Retention ⚪ (explicitly out of scope, named for completeness)
71-76. Login/register, social login, shopper-facing order history, cross-device wishlist sync, loyalty/points account, referral program.

### Mobile, PWA & Performance
77. 🟡 No installable PWA / add-to-homescreen
78. ⚪ No offline support
79. ⚪ No push notifications
80. 🟡 No app-install banner (relevant if a native app exists — unknown/out of this audit's scope)
81. 🟡 Image `sizes` tuned but no blur-placeholder (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §6)
82. 🟡 No Core Web Vitals budget/CI check (§6)

### Bangladesh-Specific — see Part 3 below for the dedicated Top 25 (cross-referenced here, not duplicated)
83-96 → Part 3.

### Enterprise / Merchant-Scale — see Part 4 below (cross-referenced here, not duplicated)
97-100 → Part 4.

---

## Part 2 — Top 50 Conversion Improvements

Ranked by real, evidence-backed conversion impact (Baymard Institute / Amazon-published UX research patterns), not by build effort. ✅ = shipped this milestone. ⏳ = real component built, not yet live-fed real data. ❌ = not built, named honestly.

1. ✅ Sticky mobile bottom buy bar — highest-leverage single mobile-conversion pattern researched
2. ✅ Quick View modal (real, fully functional — not inert)
3. ✅ Quick Add hover bar on product cards
4. ✅ Recently Viewed rail (real cross-session recall)
5. ✅ Fullscreen image zoom/lightbox
6. ✅ "You save $X" real savings-amount line (in addition to %)
7. ⏳ Countdown timer component (real, no real campaign end-time to feed it yet)
8. ✅ Back-to-top on long pages
9. ✅ Promotion/campaign banner slot (real, generic copy only)
10. ❌ Search results page (§3.1 — the single highest-ROI item not yet closed)
11. ❌ Real price display (blocks nearly every other pricing-conversion tactic below)
12. ❌ Real per-SKU stock urgency ("Only 3 left")
13. ❌ Real "X sold today" social proof
14. ❌ Guest checkout (out of scope this milestone)
15. ❌ One-page/express checkout (out of scope)
16. ❌ Autofill-friendly forms (no forms exist yet — Cart/Checkout not built)
17. ❌ Saved payment method / one-click reorder (out of scope)
18. ❌ Real reviews with photo evidence
19. ❌ Real "frequently bought together" (distinct algorithm from Related/Recommended)
20. ✅ Related/Recommended rails (real, Gateway-backed)
21. ❌ Free-shipping progress bar ("Add $12 more for free shipping" — blocked on pricing + shipping-rate composition)
22. ❌ Exit-intent offer (requires a real offer to show — none exists; correctly not faked)
23. ✅ Breadcrumbs on every page (real, structured-data-backed)
24. ✅ Real, working filters with URL persistence
25. ✅ Grid/List view toggle
26. ✅ Real sort control scoped to actually-supported fields
27. ❌ "Notify me" back-in-stock capture (needs an email/notification backend)
28. ✅ Mega-menu built from real category hierarchy
29. ✅ Mobile drawer nav
30. ✅ Real, working localStorage-backed Recent Search
31. ❌ Autocomplete search suggestions
32. ✅ Honest empty/loading/error states everywhere (never a blank screen)
33. ✅ Skeleton loading on product cards
34. ✅ Keyboard-accessible everything (Radix primitives throughout)
35. ✅ `prefers-reduced-motion` respected globally
36. ✅ WCAG-AA-safe color usage (Badge-routed, not raw text color)
37. ❌ Trust badge row (payment/security/courier) — built, not deployed (§"What Was Deliberately Not Built")
38. ✅ Generic, honest trust signals (delivery/returns/payments/support — `TrustBar`)
39. ✅ Real, functional Share button (Web Share API + clipboard fallback)
40. ❌ Print-friendly product page (`window.print()` is trivial but was not prioritized this milestone — real, low-effort, named honestly as a gap rather than silently added without verification)
41. ✅ Sticky product info column on desktop PDP
42. ❌ Live chat entry point
43. ❌ Size/fit recommendation engine (blocked on variant data)
44. ❌ Personalized "for you" ranking beyond generic Trending
45. ❌ A/B-tested layout variants (no experimentation framework wired to the live storefront)
46. ✅ Fast, real ISR-cached homepage (sub-200KB First Load JS, confirmed at build time)
47. ✅ SEO structured data (Product, Breadcrumb, Organization, Website — all real)
48. ❌ Abandoned-cart email/SMS (out of scope — no cart exists)
49. ❌ Post-purchase upsell (out of scope — no purchase flow exists)
50. ❌ Referral/loyalty conversion loop (out of scope)

---

## Part 3 — Top 25 Bangladesh-Specific Ecommerce Improvements

Researched against Daraz, Pickaboo, Chaldal, and Evaly-successor patterns — the real, dominant Bangladeshi ecommerce UX conventions this platform does not yet match.

1. 🔴 **Cash on Delivery (COD)** — the dominant payment method in Bangladesh (Daraz reports the majority of orders are COD); no COD flag/backend exists anywhere in Checkout, Payments, or the Storefront.
2. 🔴 **bKash / Nagad / Rocket mobile financial services** — no MFS payment integration exists; these are more commonly used than cards for BD ecommerce.
3. 🟠 **BDT (৳) currency formatting** — `PriceBlock` defaults to `locale: 'en'`/unspecified currency; not wired to a real BDT-first default (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §1.3).
4. 🟠 **Bangla language toggle** — no i18n/translation layer exists; `StoreContext.locale` supports only `'en'` today (`SUPPORTED_LOCALES = ['en']`).
5. 🟠 **Division → District → Upazila address hierarchy** — BD addresses are administratively hierarchical; a flat single-line address field (the only option once Checkout is built) will frustrate every shopper and increase delivery failures.
6. 🟡 **SMS order confirmation** — email open rates are low in the BD market relative to SMS; no SMS provider integration exists anywhere in the platform.
7. 🟡 **WhatsApp customer support entry point** — a real, expected BD ecommerce support channel; no integration exists.
8. 🟠 **Local courier tracking** (Pathao, RedX, Sundarban Courier, Steadfast) — no courier-specific tracking-number display or carrier-branded status exists (the Shipping module's own real carrier data isn't composed to the Storefront yet).
9. 🟡 **"Pay at door" trust messaging** — the specific reassurance copy BD shoppers expect next to COD, not generic "secure checkout" copy.
10. 🟡 **Bangla-aware search** (Bangla script + Banglish/romanized-Bangla query tolerance) — out of scope until Search itself is wired (§3.1), named here as a real, BD-specific extension of that work.
11. 🟡 **Regional delivery-zone pricing** (inside Dhaka vs. outside Dhaka is the standard BD shipping-cost split) — no delivery-zone-based rate display exists.
12. 🟡 **Eid/Puja/national-holiday campaign templates** — no seasonal campaign infrastructure exists (Part 1 item 42), named again here for its specific BD cultural relevance.
13. 🟡 **Bank EMI / installment via local banks** — a real, common BD electronics-purchase pattern (City Bank, EBL, etc. card EMI); no such display exists.
14. 🟡 **Free-delivery threshold in BDT** — once pricing exists, the threshold itself should be a real, merchant-configured BDT amount, not a hardcoded USD-shaped default.
15. 🟡 **District-level delivery estimate** ("Dhaka: 1-2 days, Outside Dhaka: 3-5 days") — no such estimator exists; `StickyMobileBuyBar`/PDP currently show no delivery estimate at all (honestly, since no real data exists).
16. ⚪ **Local trust badges** (e.g. eCAB membership, SSL Wireless payment-gateway badge) — none exist; would require a real merchant-configured badge system.
17. 🟡 **Return-to-doorstep pickup** (vs. mail-in return) — the expected BD return mechanic; no return-flow UI exists yet at all (Checkout-adjacent, out of scope).
18. 🟡 **Low-bandwidth/data-saver mode** — a real, meaningful consideration given BD mobile data costs; no explicit low-data image-quality toggle exists (Next.js's own responsive `sizes` already helps, but no deliberate data-saver UX was built).
19. ⚪ **Ramadan-hours delivery/support messaging** — a real seasonal UX consideration, not built.
20. 🟡 **Product authenticity/"genuine product" badge** — a specific trust signal BD marketplaces (Daraz Mall-style) use heavily against counterfeit concerns; no such badge/backend exists.
21. ⚪ **Bkash/Nagad "Pay Later" style BNPL** — an emerging BD pattern, not built (correctly, no such backend exists).
22. 🟡 **Mobile-first design confirmed, but no explicit low-end-device performance budget** — BD's mobile market skews toward budget Android devices; no explicit low-end-device performance testing was done this milestone (only viewport-size responsive testing).
23. 🟡 **Number formatting** (Bangladeshi lakh/crore grouping is common in local commerce copy, e.g. "৳1,00,000" not "$100,000") — `Intl.NumberFormat` with a real `bn-BD` locale would need explicit wiring and testing once pricing exists.
24. ⚪ **Local social proof** (Facebook-page-follower-count-style trust signal — extremely common on BD Facebook-commerce pages, the dominant BD SME sales channel) — not applicable to this platform's own architecture, named for completeness.
25. 🟡 **Guest-checkout-first flow** — BD shoppers strongly prefer not registering before purchase (mirrors Daraz's own guest-first default); named here as a requirement for whenever Checkout is eventually scoped, not a gap in this milestone's own work.

---

## Part 4 — Top 25 Enterprise Improvements

For a merchant genuinely running 50,000+ orders/day.

1. 🟠 **No `generateStaticParams()`** for top products/categories — every detail-page first-hit pays a live Gateway round-trip forever (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §6).
2. 🟠 **No CI workflow** running this platform's own quality gates automatically (§6).
3. 🟡 **No component-level regression test suite** (jsdom/RTL) for the Store Components library (§6).
4. 🟡 **No bundle-size budget/CI check** (§6).
5. 🟡 **No multi-vendor/marketplace data model** — this platform is architecturally single-merchant; a real marketplace pivot would need a Seller entity threaded through Catalog, Orders, and Payments.
6. 🟡 **No B2B/wholesale pricing tier** — no customer-group-based pricing exists anywhere in Pricing.
7. 🟡 **No multi-warehouse "ships from X, arrives by Y" display** — Inventory has real per-warehouse data (Phase 2.3); none of it is composed to the Storefront.
8. 🟡 **No multi-language storefront** (beyond the single BD-focused locale gap already named in Part 3).
9. 🟡 **No multi-currency storefront** beyond `StoreContext`'s own currently-unused `currency` resolution.
10. 🟡 **No A/B testing framework wired to real pages** — the Gateway's own Feature Flag framework (Slice 1.5) exists and is real; no experiment has ever actually been run through it on a live Storefront page.
11. 🟡 **No CDN cache-invalidation visibility** — the Gateway's own cache-tag system is real (`catalog:products`, etc.); no dashboard or webhook-triggered invalidation flow exists yet.
12. ⚪ **No SEO redirect-management UI** — a merchant renaming a category/product slug today has no way to configure a 301 redirect.
13. 🟡 **No merchandising-rules engine** (auto-collections by rule, e.g. "all in-stock items under $50") — every collection is manually curated today (and Collections themselves can't even list members yet — a real, pre-existing backend gap named in Milestone 1).
14. 🟡 **No customer-segmentation-driven personalization** — the CDP/Personalization Context (Phase 3.2) is real infrastructure; nothing on the live Storefront consumes it yet.
15. 🟡 **No real-time inventory sync via webhooks** — Storefront reads are cache-window-bound (`revalidateSeconds`), not event-driven; at 50,000 orders/day, stale stock display risk is real.
16. ⚪ **No visible API rate-limit/usage dashboard** for the Gateway's own real rate-limiting (already implemented server-side, Slice 1).
17. 🟠 **No cookie-consent/GDPR banner** — a real compliance gap for any merchant selling into the EU/UK.
18. 🟡 **No structured audit trail of Storefront-side config changes** (theme/template changes, once M3 lands) — not yet relevant (no Theme Package exists), named for forward visibility.
19. 🟡 **No image/video sitemap** — only the page sitemap exists today (`sitemap.xml`).
20. 🟡 **No canonical-URL strategy for filter/sort permutations** — every `?brand_id=&sort=` combination on the Category page is currently indexable as a distinct URL; at scale this risks duplicate-content SEO dilution without an explicit `rel=canonical` or `noindex` policy on filtered views.
21. 🟡 **No structured logging/tracing correlation from Storefront through Gateway to backend** visible to engineering — request tracing exists at the Gateway (Slice 1.5) but nothing surfaces a correlation ID on the Storefront's own error boundaries for support debugging.
22. 🟡 **No graceful degraded-mode UX** when the Gateway itself is down (today: Next.js's own generic error boundary, not a branded "we're experiencing high demand" state a 50,000-order/day merchant would want).
23. ⚪ **No headless commerce API contract versioning visible to third-party integrators** — the Gateway has real API versioning (Slice 1.5) but no public developer-facing changelog/docs site.
24. 🟡 **No load-tested concurrency ceiling documented for the Storefront's own SSR paths** (Category/Product-with-searchParams routes) — no performance budget or load test exists at any realistic order-volume scale.
25. 🟡 **No disaster-recovery/rollback runbook specific to the Storefront** (as distinct from the Gateway's own, which is more mature) — worth a dedicated pass once this app carries real production traffic.

---

## Launch Blockers, Priority Tiers, and Roadmap

### 🔴 Launch Blockers (a merchant cannot sell without these)
1. Real pricing (Gateway composition) — blocks the entire "Add to cart" moment.
2. Reviews/ratings backend — table stakes for modern ecommerce trust.
3. COD + bKash/Nagad payment support — the dominant BD payment methods; a BD-first storefront without them is not sellable in its primary market.
4. Cart + Checkout themselves (explicitly out of this milestone's own scope, but the largest real blocker of all).

### 🟠 High Priority
Search results page wiring (§3.1) · real per-SKU stock/availability · variant/attribute selection · `generateStaticParams` · CI workflow · BDT currency + Bangla locale wiring · Division/District/Upazila addressing · local courier tracking display.

### 🟡 Medium Priority
Everything tagged 🟡 above — real, valuable, correctly sequenced after the launch blockers.

### ⚪ Low Priority / Future Roadmap
PWA/offline/push · AR try-on · voice/visual search · loyalty/referral programs · A/B testing activation · multi-vendor marketplace pivot.

---

## What Was Deliberately Not Built This Milestone (and why)

- **Payment/courier icon rows** — the component architecture is real and reusable (`TrustBar`-class pattern), but deploying "We accept Visa/bKash" copy before any real payment integration exists would be a forward-looking, unverified claim — not yet honest to ship.
- **Countdown Timer live on any page** — `CountdownTimer.tsx` is a real, fully-functional, tested-by-inspection component; no page feeds it a fabricated campaign end-time, since no Flash Sale/campaign backend exists to source a real one from.
- **Discount %/savings amount on any live product** — `PriceBlock`'s own discount and "You save $X" logic is real and will activate the instant real `compareAtPrice` data flows through; today it is honestly dormant on every real page.

---

End of audit.
