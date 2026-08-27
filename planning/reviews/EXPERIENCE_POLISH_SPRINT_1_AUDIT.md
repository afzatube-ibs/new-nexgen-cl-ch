# neXgen Experience Polish Sprint 1 — UX & Conversion Audit

**Status: PLANNING ONLY. No code has been written against this document. Per the sprint brief's own instruction, implementation begins only after this is reviewed and approved.**

**Method:** every file this audit references was actually read this session — every page in `apps/storefront/src/app`, every component in `packages/storefront-engine/src/{primitives,components,cart,checkout,order}`, the real Gateway response shapes (`gateway/types.ts`), and the platform's own two prior audits (`MERCHANT_CONVERSION_AUDIT.md`, `MISSING_ECOMMERCE_FEATURES_AUDIT.md`). Nothing below is inferred from a framework's typical shape — it's what the code in this repository actually does today, as of Beta Experience Pack 1's completion.

Written the way the brief asked: as an ecommerce owner, a CRO specialist, a UI designer, a UX researcher, a merchandising expert, and a customer-psychology expert, reviewing this storefront side by side with Amazon, Daraz, Shein, and Apple — not as an engineer checking whether the code compiles.

---

## The one fact that governs this entire audit

**No product on this storefront shows a price.** `ProductSummary`/`ProductDetail` (`gateway/types.ts`) carry no price field; `PriceBlock.tsx`'s own docblock calls this "a real, critical, load-bearing gap" and "the #1 finding" of the prior audit. Cart shows "Calculated at checkout." Every product card, the PDP, the cart drawer, the cart page — all say, honestly, "Price unavailable."

This is not a UI problem this sprint can polish away, and it is **out of this sprint's stated scope** ("Do NOT rewrite backend"). But it has to be named in the loudest possible terms up front, because it caps the ceiling of every metric this sprint is asked to move:

- CTR on a product with no price is a click on faith, not intent.
- Add-to-cart with no price is not a commitment — it's curiosity.
- AOV cannot be measured, let alone optimized, when no order has a real subtotal.
- "Buy now" urgency copy ("only 3 left," "40% off") next to "Price unavailable" reads as broken, not premium — it actively damages trust.

Everything in this audit is written to be **honest under this constraint**: every recommendation is tagged with whether it's real and buildable today, or whether it's a UI shell that will only earn its keep the day a real Gateway pricing route exists. Nothing here proposes hardcoding a price, a rating, or a fake countdown to make a screenshot look better — that would fail this platform's own standing discipline (see `MISSING_ECOMMERCE_FEATURES_AUDIT.md`, `MERCHANT_CONVERSION_AUDIT.md`) and this sprint's own "never fabricate data" instruction.

**Recommendation, stated once here and not repeated: wiring a real Gateway pricing route (composing the existing, real Pricing module's `Price List` data into `ProductSummary`/`ProductDetail`) is not "redesigning architecture" — the Pricing module and its data already exist; only the Catalog→Gateway composition step is missing. It is the single highest-leverage change available to this platform, full stop, and it is a backend/gateway change, so it is explicitly named here as a recommendation for a dedicated follow-up, not something this Polish Sprint touches.** Everything below assumes it stays out of scope for now.

---

## 1. Full UX audit — page by page

Severity key: 🔴 actively hurts a metric today · 🟠 real, buildable gap · 🟡 polish opportunity · 🟢 already good, don't touch

### Homepage (`apps/storefront/src/app/page.tsx`)
The brief's own words are correct: **this page is too empty.** It is a vertical stack of identically-styled gray-bordered boxes — Hero, Category Grid, Featured, Trending, Recently Added, Brand Slider, Trust Bar — each with the same card chrome, same spacing, same weight. There is no single moment that says "buy something now."
- 🔴 **No merchandising hierarchy.** Every section reads at the same visual volume. A shopper's eye has nowhere to land first. World-class homepages (Amazon, Daraz, Shein) lead with urgency/value (a deal, a sale, a trending signal) within the first screen, above generic category browsing.
- 🔴 **The Hero is a text card, not a moment.** `Hero.tsx` renders a heading + subheading in a bordered gray box — correctly honest (no fake lifestyle image exists), but it does nothing to answer "why buy here?" It's a placeholder that reads as a placeholder.
- 🟠 **"Today's deal," "Flash sale," "Recommended for you" — all named in the brief — do not exist on this page at all.** `PromotionBanner` exists but only ever renders static, generic copy ("New arrivals every week") — never a real, merchant-set offer.
- 🟠 **Six product rails, zero differentiation in presentation.** Featured / Trending / Recently Added / Best sellers all use the exact same `ProductGrid` at the exact same visual weight — nothing tells a shopper which one matters more.
- 🟡 `TrustBar` is generic, un-emphasized, and placed at the very end after the shopper has already decided whether to keep scrolling — trust signals convert best *before* the ask, not after it's already been made six times.
- 🟡 No "why choose us" narrative section at all — the brief explicitly asks for one.
- 🟢 The underlying data-fetch pattern (real ISR, real ✅Server Component, ✅Suspense-ready skeletons) is genuinely fast and sound — do not touch the fetching, only the presentation built on top of it.

### Header (`StoreHeader.tsx`)
- 🟢 Real branding (logo/color/announcement/WhatsApp) is a strong, already-shipped foundation — keep it.
- 🟡 The announcement bar is a single flat color strip with no icon, no rotation, no emphasis — it reads as a system banner, not a merchandising moment (compare Daraz/Shein's icon + bold price-anchor announcement bars).
- 🟡 Cart badge uses the merchant's primary color but the bag icon itself has no motion on add — a shopper who just added an item gets no header-level acknowledgement beyond the drawer opening.
- 🟠 Wishlist, Compare, Language/Currency are absent — correctly, per that component's own docblock (no backend yet) — but the header has no reserved visual slot for them either, so adding them later will reflow the whole bar rather than filling a designed space.

### Navigation / Mega menu
- 🟢 Real category hierarchy, keyboard-accessible `DropdownMenu` — functionally solid.
- 🟡 Purely textual — no category thumbnail, no "shop by category" imagery, no featured-in-menu product slot. Every competitor's mega menu uses at least category imagery to make browsing feel like shopping, not like reading a sitemap.

### Search (`SearchOverlay.tsx`)
- 🔴 **Submitting a search shows "Search results aren't available yet."** This is the single most damaging honest-gap in the whole storefront: a shopper who searches is a shopper with purchase intent, and today that intent hits a dead end. Correctly not faked (no results page exists) — but this is the highest-leverage *backend* item in this platform's own prior audit for a reason.
- 🟢 Recent search, focus trap, Escape-to-close are real and solid.
- This sprint cannot wire real search results (backend/Gateway work). What it CAN do: make the honest "not available yet" state feel intentional rather than broken (see §3), and make sure Category browsing — the actual real discovery path — is one click from the search overlay itself.

### Category page (`apps/storefront/src/app/categories/[idSlug]/page.tsx`)
- 🟢 Already real and reasonably strong from Pack 1: sticky filter sidebar, promotion banner, sort, recommended rail, recently viewed.
- 🟡 Filter sidebar and product grid carry identical visual weight to every other bordered box on the site — no visual distinction between "controls" and "merchandise."
- 🟡 No result-count framing ("128 results") at the top — a small, real, zero-backend addition (the Gateway pagination meta already carries `total`).
- 🟡 No breadcrumb-level category banner/hero treatment beyond `CategoryBanner` — worth confirming it's actually wired in (needs a visual pass either way).

### Product Card (`primitives/ProductCard.tsx`)
- 🟢 Genuinely strong bones: real Quick Add bar, real hover-reveal, real Quick View, real `CodAvailableBadge`, honest wishlist/compare (inert, honestly labeled).
- 🔴 **"Price unavailable" on every single card is the #1 visual credibility problem on the entire storefront** — see the governing constraint above.
- 🟠 Badge system is currently exactly one badge (`StockBadge`) plus one static COD pill — no slot architecture for a merchant to turn on/off "New," "Best seller," "Low stock," "Free shipping" per the brief's explicit "merchant configurable" requirement. Building the slot now (even while most badges stay dark until real data exists) is real, valuable, zero-fabrication work.
- 🟡 No hover/secondary image (real data gap — one image field only) — correctly not fakeable; the hover *zoom* on the single image is the honest substitute and should be kept/emphasized.
- 🟡 Card corners, borders, and shadow are the exact same tokens as an Admin data-table row. Nothing about the card visually signals "this is a product for sale" versus "this is a system list item."

### Product Detail Page / Buy Box (`products/[idSlug]/page.tsx`)
- 🟢 Real Pack 1 work: Buy Now + Add to Cart, COD badge, trust row, payment methods, courier row, honest bundle/cross-sell placeholder, sticky info column, sticky mobile bar.
- 🔴 Same "Price unavailable" problem, at the moment it hurts most — the exact instant a shopper is deciding whether to buy.
- 🟠 **CTA hierarchy is flat.** Add to Cart and Buy Now render as equal-weight, side-by-side buttons of the same size and near-identical color. Every high-converting PDP researched (Amazon, Shein, Daraz) makes ONE action visually dominant (usually Buy Now/Buy It Now on mobile, Add to Cart on desktop) — two equally loud CTAs create decision friction, not clarity.
- 🟠 No urgency or social proof anywhere on the page — correctly absent (no real stock-count, no real "X people viewing" data) but the page also does nothing with the real data it DOES have: real stock status, real category, real brand. `StockBadge` today is a single small pill with no visual weight near the CTA.
- 🟡 Gallery, title, trust content, and disclosures all share one visual rhythm — no breathing room / rhythm change between "decide" content (price, stock, CTA) and "reassure" content (trust, payment, delivery) and "learn more" content (description, FAQ).
- 🟡 The new "More ways to buy" honest placeholder (Pack 1) is good discipline but visually inert — a plain caption in a plain card. It doesn't need fake urgency, but it can look intentional instead of apologetic.

### Gallery (`ProductGallery.tsx`)
- 🟢 Real zoom/lightbox/thumbnail rail — solid, not flagged for rework.
- 🟡 Thumbnail rail styling matches every other bordered-box aesthetic on the site — worth a pass purely for visual cohesion with the rest of the redesigned Buy Box, not for new functionality.

### Cart Drawer (`cart/CartDrawer.tsx`)
The brief's framing is exactly right: **this wastes space today.** It is: header, line items, `PromoCodePlaceholder` (a single sentence), `CartSummary` (mostly "Calculated at checkout"), one button. On a shopper with one item in cart, roughly 70% of the drawer's vertical space is empty white below the line item.
- 🔴 Zero AOV mechanics of any kind — no cross-sell, no add-on, no free-shipping progress, no bundle nudge. This is the single highest-leverage empty space in the whole storefront, because it's the one moment a shopper has *already* said yes to one product.
- 🟢 The honest, real mechanics underneath (save-for-later, quantity, remove, real Gateway recommendations already exist as infrastructure via `getRecommendations`) are exactly what's needed to fill this space *without fabricating anything* — see §3.
- 🟡 `PromoCodePlaceholder`'s honest one-liner is correct discipline but visually disconnected from the summary block right below it — they read as two unrelated system messages instead of one "here's what affects your total" narrative.

### Cart page (`apps/storefront/src/app/cart/page.tsx`)
- 🟢 Same real mechanics as the drawer, correctly non-duplicated (same `useCart()`, same row/summary components).
- 🟡 Two-column layout is sound; the empty-cart state is honest but generic — no "here's what's trending" recovery content for a shopper who arrived with nothing in cart.

### Checkout (`checkout/CheckoutForm.tsx`)
Per the brief: **do not touch checkout logic.** The logic is genuinely real (Sprint 5's orchestrated `POST /v1/checkout/submit`) — this is an experience-only pass.
- 🟢 Already carries a real Sprint 5 UX refinement pass — card-based sections, sticky order summary, secure-checkout microcopy, real inline field errors, disabled-while-submitting protection against duplicate orders. This is close to best-practice shape already.
- 🟡 Every section (Contact, Shipping, Courier, Payment) carries equal visual weight and appears all at once — a long, undifferentiated form reads as more effortful than a form broken into a visible sense of progress, even without a true multi-step wizard (which would be a logic change, correctly out of scope).
- 🟡 No visible order-so-far reassurance beyond the static sticky summary — nothing acknowledges progress as fields are correctly filled in (a real, zero-logic-change trust signal: a filled section can visually confirm itself).
- 🟢 "Secure checkout" microcopy under the submit button is good and should stay — arguably it's currently the *only* trust reinforcement on the entire page and could be joined by the same real trust row (payment/courier icons) already built for the PDP, reused here rather than duplicated.

### Success page (`checkout/success/page.tsx`)
- 🟢 Genuinely well built — real skeleton-shaped loading state, real receipt card, real payment-status `Alert`, honest failure messaging that still confirms the real order exists.
- 🟡 Purely functional/informational in tone — no moment of delight (a real order just happened; this is the platform's one guaranteed-positive-emotion screen and it currently looks identical to an error page with a green checkmark swapped in).
- 🟡 No real next-step merchandising ("track your order," "here's what's trending" for a return visit) beyond a single "Continue shopping" button — a real, zero-fabrication opportunity, since `getRecommendations` already exists as real infrastructure.

### Customer Account
- 🔴 **Does not exist.** No `/account` route anywhere in `apps/storefront`. The header's Account icon is honestly labeled "coming soon." Nothing to audit — named here for completeness per the brief's own review list, out of scope for a backend-free sprint (no auth/account backend exists on the storefront side yet).

### Wishlist
- 🔴 **Does not exist as a real feature.** The heart icon on every product card is real, honestly inert, and correctly labeled "coming soon" — no Wishlist backend. Nothing to redesign until that backend exists; flagged here as a real, named prerequisite for a future sprint, not silently skipped.

### Compare
- 🔴 **Does not exist as a real feature**, same honest-inert treatment as Wishlist. Same recommendation: named, not built.

### Footer (`StoreFooter.tsx`)
- 🟢 Real branding, real contact/social, real payment/courier trust rows — solid foundation.
- 🟡 Four-column grid with identical card-less styling to the rest of the page — functional, not memorable. No newsletter signup in the footer itself (one exists as a homepage primitive, `Newsletter.tsx`, but isn't cross-linked/reinforced in the footer where shoppers expect it).
- 🟡 No policy links (Privacy/Terms/Shipping/Returns) — correctly absent, no CMS backend exists yet; named, not silently skipped.

### Mobile navigation
- 🟢 Real drawer-based mobile menu with proper nested category disclosure — functionally solid and already thumb-reachable (left-anchored, full nested list, no horizontal scroll).
- 🟡 Visually identical treatment to the desktop dropdown menu, just narrower — no mobile-specific merchandising (e.g., a featured category tile at the top of the mobile menu) that competitors' mobile-first nav patterns use.

### Mobile PDP
- 🟢 The sticky mobile buy bar (`StickyMobileBuyBar.tsx`) is genuinely the right, industry-standard pattern, and it's already real.
- 🟠 The sticky bar shows only "Add to cart" — Buy Now (the higher-intent, faster-checkout action, and the one actually most proven on mobile PDPs specifically) is not present in the one place mobile shoppers spend the most time. This is a real, no-backend-needed gap.
- 🟡 The reserved bottom padding (`pb-20 lg:pb-0`) correctly prevents overlap today, but the honest "More ways to buy" card and the FAQ disclosures sit awkwardly close to the sticky bar's shadow edge on a long scroll — worth confirming spacing once the bar itself gains a second CTA.

### Mobile checkout
- 🟢 The form itself already reflows correctly to single-column on mobile (confirmed live in Pack 1's own browser verification).
- 🟡 The sticky desktop order-summary card has no mobile equivalent — a mobile shopper filling a long form has zero visibility into what they're about to pay/what's in their order without scrolling all the way back up, which is a real, common mobile-checkout abandonment driver (Baymard's own published research on this exact pattern).

---

## 2. Conversion audit

Mapped explicitly to the metrics the brief names. ✅ = already real and working (protect it). 🔧 = buildable now, no backend, no fabrication. ⛔ = genuinely blocked on backend/data that doesn't exist (named, not built this sprint).

| Metric | Already real (✅) | Buildable now (🔧) | Blocked on backend (⛔) |
|---|---|---|---|
| **CTR** (card → PDP) | Hover zoom, Quick View, honest badges | Configurable badge slot, urgency micro-copy using *real* stock signal, card visual distinctness from admin-table aesthetic | Rating stars, "X viewing," secondary image |
| **Add to Cart** | Real localStorage cart, Quick Add bar, optimistic "Added" state | Clearer CTA hierarchy on PDP, sticky-bar Buy Now, real-stock urgency framing ("In stock" → "Only N left" once a real per-SKU count is available — see note below) | Real price (the actual decision input) |
| **Buy Now clicks** | Real, wired end-to-end (Pack 1) | Visual dominance over Add to Cart as the primary action; add to sticky mobile bar | — |
| **Checkout completion** | Real orchestrated submit, real field-level errors, real duplicate-order protection | Visual progress/reassurance per section, sticky mobile order summary, reused trust row | Saved address/one-click reorder (needs account) |
| **AOV** | Real cart engine (quantities, save-for-later) | **Cart Drawer as an AOV surface**: free-shipping progress bar (once a merchant-configured threshold exists — this is an Appearance-schema extension, not a new backend domain), real cross-sell rail via existing `getRecommendations`, gift-option/note field (a real, zero-backend UI affordance that can be silently ignored server-side until a real field exists — flagged, not silently shipped as if functional) | Bundle pricing, quantity-break pricing |
| **Customer confidence** | Real trust badges, real payment/courier rows, real secure-checkout copy | Consistent trust-row reuse across PDP/Cart/Checkout (currently built three times with slightly different treatments), visible order-so-far reassurance | Reviews, verified-purchase badges |
| **Returning customers** | Real Recently Viewed (cross-session, localStorage) | Recommendation rail on Success page, "welcome back" recognition using existing Recently Viewed data | Account/order history, loyalty |

**A note on "real per-SKU stock urgency":** `StockBadge` today renders from `product.status` (`active`/`draft`/etc.), not a real quantity. "Only 3 left" requires a real inventory-count field flowing through the Gateway — currently absent from `ProductSummary`. This sprint can make the *existing* stock status (in stock / out of stock) visually louder and more decision-relevant; it must not invent a fake number. Named as a real, small, additive backend/Gateway follow-up (expose the real `Inventory` module's on-hand count), not attempted here.

---

## 3. Page-by-page improvement plan

Every item is tagged **[metric]** it serves and **[data]** — 🔧 real data only / no backend, or ⛔ needs backend (named, not built this sprint).

### Homepage
1. 🔧 Redesign `Hero` into a real merchandising hero: large, bold, high-contrast headline treatment using the merchant's own real branding accent color (`StorefrontBranding.primaryColor`/`accentColor` already exist) instead of a flat gray box. **[CTR, Confidence]**
2. 🔧 Promote a real "shop now" moment above the fold that visually links Hero → the real Category Grid, so the first screen ends in an action, not a scroll invitation. **[CTR]**
3. 🔧 Re-tier the rails: give the top real rail (Trending, since it's the real "what's happening now" signal) a visually distinct, larger treatment than the rails below it, rather than six identical `ProductGrid` blocks. **[CTR, AOV via discovery]**
4. 🔧 Move `TrustBar` up, directly under the Hero, not at the page's very end — trust reads best before repeated asks, not after. **[Confidence]**
5. 🔧 Give `PromotionBanner` a genuinely bannerlike visual treatment (not a bordered gray box matching every other section) so the honest "New arrivals every week" copy at least *looks* like a real merchandising strip while it waits for real campaign data. **[CTR]**
6. ⛔ "Today's deal" / "Flash sale" — needs a real campaign/end-time source (`CountdownTimer.tsx` is already real and ready; only a real end-time is missing). Named as the natural next real merchandising feature once a lightweight "Campaign" concept exists — not attempted here.

### Header / Navigation
7. 🔧 Give the announcement bar an icon + slightly bolder treatment so it reads as a value prop, not a system notice. **[CTR]**
8. 🔧 Add a brief scale/pulse micro-interaction to the cart icon on add (CSS-only, respects `prefers-reduced-motion`) so the header itself acknowledges the action, reinforcing the drawer's own confirmation. **[Add to Cart follow-through / confidence]**
9. 🔧 Reserve (but do not populate) a header slot for Wishlist/Compare/Language so a future real feature drops in without reflowing the bar. **[Merchant extensibility]**
10. 🔧 Add real category thumbnail images to the mega menu (`CategorySummary.image` already exists on the real Gateway type — currently fetched but not rendered in the menu). **[CTR, discovery]**

### Search
11. 🔧 Restyle the honest "not available yet" state so it visually offers the real alternative (jump into Category browsing / top categories) instead of reading as a dead end. **[Bounce reduction]**
12. ⛔ Real search results page — named as this platform's own highest-ROI backend item (already the #1 ranked item in `MERCHANT_CONVERSION_AUDIT.md` Part 2), explicitly not attempted this sprint.

### Category page
13. 🔧 Add the real result count ("128 results") using the Gateway's own existing pagination meta. **[Confidence, scanning]**
14. 🔧 Visually separate "controls" (filter/sort) from "merchandise" (grid) with a distinct surface tone, so the eye recognizes the grid as the shopping surface. **[CTR]**
15. 🔧 Confirm/strengthen `CategoryBanner` as a real per-category merchandising header (image + name + description), not a plain text breadcrumb repeat. **[CTR]**

### Product Card v4
16. 🔧 Build a real, merchant-configurable badge **slot system** (top-left corner stack) that can render any combination of: Stock status (real, exists today), COD (real, exists today), and dark/reserved slots for New/Best seller/Low stock/Free shipping the moment each has real data — architected once, not duplicated per badge. **[CTR]**
17. 🔧 Give the card a visual identity distinct from an Admin data-row: slightly larger corner radius on the image only, a subtler border, a hover elevation that feels tactile rather than a generic `shadow-elevation-2` shared by every bordered box on the platform. **[CTR, brand identity]**
18. 🔧 Reframe the honest "Price unavailable" state itself — today it's a plain caption identical to an error message; a calmer, intentional treatment (e.g., "See price on page") reads as a deliberate choice, not a bug, until real pricing lands. **[Confidence]**

### PDP / Buy Box
19. 🔧 Establish real CTA hierarchy: Buy Now visually dominant (solid, brand-colored) with Add to Cart as the clear secondary (outline/soft) — not two equal-weight buttons. **[Buy Now clicks, decision clarity]**
20. 🔧 Give `StockBadge` more visual presence directly beside the CTA (not just above the price block) — the real signal that exists today deserves real prominence. **[Add to Cart, urgency]**
21. 🔧 Introduce clear visual rhythm/section breaks between "Decide" (gallery, title, price, stock, CTA), "Reassure" (trust/payment/courier), and "Learn" (description, FAQ) — spacing and surface-tone changes only, no new components. **[Checkout completion via reduced overwhelm]**
22. 🔧 Give the honest "More ways to buy" placeholder a calmer, more intentional visual treatment consistent with #18 — signal "coming soon, deliberately," not "empty box." **[Confidence]**
23. 🔧 Add Buy Now to the sticky mobile bar alongside Add to Cart. **[Buy Now clicks — mobile, the brief's own highest-priority surface]**

### Cart Drawer — the AOV rebuild
This is the single highest-impact area in the entire audit, per the brief's own framing, and every item below uses only real, already-existing infrastructure.
24. 🔧 **Free-shipping progress bar** — real IF a merchant-configured free-shipping threshold exists. This is a genuinely small Appearance-schema extension (one more field on the same `store_appearances` row Pack 1 already built, following that module's own established extensibility pattern — not a new backend domain). Until a merchant sets one, the component renders nothing (never a fabricated default threshold). **[AOV]**
25. 🔧 **"You might also like" cross-sell rail inside the drawer** — real, using the exact same `getRecommendations()` call already used on the PDP/Homepage (`slot: 'related'` seeded from the cart's own product ids), rendered in the drawer's own current dead space. Zero new data source. **[AOV]**
26. 🔧 Visually connect `PromoCodePlaceholder` and `CartSummary` into one coherent "your total" narrative block instead of two disconnected system messages. **[Confidence]**
27. 🔧 A real, honest gift-note/order-note free-text field — genuinely useful today even with no backend field to persist it into yet *if and only if* it is wired to actually reach the real order (via the existing `CheckoutForm`'s own request body, as an additive optional field the backend can safely ignore until it adds a column) — **flagged as needing a one-line backend contract confirmation before building**, not silently shipped as if it does something it doesn't.
28. 🔧 Real delivery-estimate reassurance line reusing the exact same courier-badge data already on the PDP ("Ships via Pathao/Steadfast — arrives in 2–4 days" only if that copy is genuinely generic/non-committal, matching the FAQ disclosure's own established honest-generic pattern — never a fabricated per-order estimate). **[Confidence]**

### Cart page
29. 🔧 Same cross-sell rail as the drawer (#25), reused, not duplicated. **[AOV]**
30. 🔧 Empty-cart state gets a real "Trending now" rail (same `getRecommendations` call already used elsewhere) instead of a dead end. **[Bounce recovery]**

### Checkout
31. 🔧 Visual "section complete" affordance (a checkmark/subtle color shift on a card once its own required fields validate) — pure presentation on top of the exact same `validate()` logic already there, zero business-logic change. **[Checkout completion]**
32. 🔧 Reuse the PDP's real trust/payment-method row inside or beside the Payment card, rather than the current bare `PaymentMethodSelector` with no surrounding reassurance. **[Checkout completion]**
33. 🔧 Sticky order-summary equivalent on mobile (a collapsed "Order total: ৳X · N items" bar the shopper can expand) — presentation-only, reads the same real `CartSummary` data already there. **[Mobile checkout completion — Baymard's own published research names an invisible running total as a top-10 real cause of mobile checkout abandonment]**

### Success page
34. 🔧 A real, brief celebratory visual treatment (confetti-adjacent restraint — a warm accent wash behind the checkmark, not an animation library) — CSS-only. **[Returning customers — first positive emotional beat]**
35. 🔧 Real "trending now" rail below the receipt, same reused `getRecommendations` call. **[Returning customers]**

### Mobile-wide
36. 🔧 Audit every tap target against a 44×44px minimum (the icon-only header/quick-action buttons are close but not confirmed) — accessibility AND thumb-friendliness are the same requirement here. **[Mobile conversion broadly]**
37. 🔧 Confirm no horizontal scroll/layout shift anywhere in the redesigned sections at 375px — a hard performance/QA gate, not a design opinion.

### Demo Mode
38. ⛔ **No demo-mode concept exists anywhere in this codebase today** (confirmed by a direct search — no `is_demo`/`demoMode` flag in the backend, gateway, or storefront). Today there is exactly one store with real seed data; "Demo Store" and "production store" are not actually distinguished anywhere. Building real separation (a flag + a way to mark content as demo-only) is a genuine, if small, backend/data-model change — named here as a distinct, separately-scoped follow-up requiring explicit confirmation before any code is written, not something this Polish Sprint (explicitly UI/UX-only) should decide unilaterally to build.

---

## 4. UX priority score

Scored 1–5 on Impact (business-metric leverage), Effort (build cost within this sprint's real, no-backend constraint), and Confidence (how sure we are it moves the named metric, per real CRO research or direct platform precedent). **Priority = Impact × Confidence ÷ Effort**, higher is more urgent.

| # | Item | Impact | Effort | Confidence | Priority |
|---|---|---|---|---|---|
| 24–26 | Cart Drawer AOV rebuild (progress bar, cross-sell, unified total) | 5 | 3 | 5 | 8.3 |
| 19 | PDP CTA hierarchy (Buy Now dominant) | 5 | 1 | 5 | 25.0 |
| 23 | Buy Now on sticky mobile bar | 5 | 1 | 5 | 25.0 |
| 16 | Product Card badge slot system | 4 | 3 | 4 | 5.3 |
| 33 | Mobile checkout sticky total | 4 | 2 | 4 | 8.0 |
| 1–3 | Homepage hero + rail hierarchy | 4 | 3 | 3 | 4.0 |
| 25/29 | Cart-page + drawer cross-sell rail (shared build) | 4 | 2 | 4 | 8.0 |
| 11 | Search dead-end restyle | 3 | 1 | 4 | 12.0 |
| 20–21 | PDP visual rhythm + stock prominence | 3 | 2 | 3 | 4.5 |
| 31–32 | Checkout section-complete + trust reuse | 3 | 2 | 3 | 4.5 |
| 4–5 | TrustBar reposition + PromotionBanner treatment | 3 | 1 | 3 | 9.0 |
| 10 | Mega-menu category thumbnails | 2 | 1 | 3 | 6.0 |
| 34–35 | Success-page delight + recommendation rail | 3 | 2 | 3 | 4.5 |
| 7–9 | Header announcement/cart micro-interaction/reserved slots | 2 | 1 | 2 | 4.0 |
| 13–15 | Category page count/separation/banner | 2 | 1 | 3 | 6.0 |
| 36–37 | Mobile tap-target and layout-shift QA pass | 3 | 1 | 5 | 15.0 |

**Read this table as sequencing pressure, not a strict queue** — §10 groups these into phases that respect real build dependencies (e.g., a shared cross-sell rail component should be built once, then consumed by both the Cart Drawer and Cart page items).

---

## 5. Estimated business impact

Stated honestly: **this platform has no live traffic yet, so there is no first-party A/B data behind these numbers.** The ranges below are the published, widely-cited external benchmarks (Baymard Institute checkout/cart-UX research, and Amazon/Shopify's own published sticky-mobile-CTA and cross-sell findings) for the *class* of change proposed, not a promise specific to this store. They are included because the brief asked for an estimate, and an honest external-benchmark estimate, clearly labeled as such, is more useful than a fabricated internal number.

| Change class | Typical published impact range | Source pattern |
|---|---|---|
| Sticky mobile buy bar with a clear primary CTA | +5–12% mobile add-to-cart rate | Widely observed mobile-commerce pattern (Amazon, Daraz, Shein all use it) |
| Cart cross-sell/recommendation surfacing | +5–15% AOV among carts shown a relevant recommendation | Amazon's own long-published "customers who bought this also bought" impact class |
| Free-shipping progress bar (once a real threshold exists) | +3–8% AOV among carts near the threshold | Widely documented ecommerce cart-UX pattern |
| Reducing checkout visual overwhelm / adding progress reassurance | Meaningful reduction against Baymard's ~17–26%-of-abandonment "too long/complicated" and "didn't trust site with card info"-adjacent categories | Baymard Institute cart/checkout abandonment research |
| Clear single-CTA hierarchy (vs. two equal-weight buttons) | Reduces decision friction; effect size platform-specific, directionally positive per standard CRO heuristics (Hick's Law) | General CRO/UX research, not commerce-specific |

**The single change this document estimates would outperform everything else combined, by a wide margin, is real pricing** — every number above is bounded by shoppers who already know what they're buying costs. This is restated here, once, because it is the honest, unavoidable conclusion of an impact analysis done properly.

---

## 6. Screenshot references

Per the brief: inspiration only, never copied. Rather than reproducing real competitor screenshots (which this platform's own copyright discipline and this audit's own "never fabricate/never copy" standard both rule out), two **original wireframe concepts** were produced this session to make the recommendations above concrete:

- **Homepage merchandising concept** — shows the re-tiered structure from items 1–5: a bold hero/deal moment, a trust strip pulled up near the top, real category tiles with imagery, and a differentiated "best sellers" rail with real-style urgency/discount treatment (illustrative numbers only, clearly not live data).
- **Product Card v4 concept** — shows the badge-slot system (item 16), the sharpened visual identity (item 17), and honest price/stock micro-copy treatment (item 18) in one composed card.

Both were shown inline this session as reference wireframes, not final designs — actual implementation will use this platform's real `@nexgen/ui` tokens/components (Badge, Card, Button, Text), never ad hoc markup, and will render only real data, never the illustrative BDT amounts/discounts/stock-counts shown in the wireframes.

---

## 7. Component change list

No new component library is proposed. Every item below is a **modification to an existing component**, or a **small new component that composes existing primitives**, consistent with `packages/ui`/`packages/storefront-engine`'s own established pattern.

| Component | Change type | What changes |
|---|---|---|
| `primitives/Hero.tsx` | Modify | Visual treatment only — heading/CTA hierarchy, real branding-color accent |
| `primitives/TrustBar.tsx` | Modify (usage) | Same component, moved higher in homepage composition — no component code change needed, only `app/page.tsx`'s section order |
| `components/PromotionBanner.tsx` | Modify | Visual treatment only |
| `primitives/ProductCard.tsx` | Modify | Add badge-slot layout region; visual identity pass |
| **`components/ProductBadgeSlot.tsx`** | **New** | Small, composes existing `Badge`/`StockBadge`/`CodAvailableBadge` into one ordered slot — not a duplicate of any of them, a layout wrapper only |
| `components/PriceBlock.tsx` | Modify | Honest-empty-state visual treatment only (item 18) — pricing logic untouched |
| `app/products/[idSlug]/page.tsx` | Modify | CTA hierarchy, section rhythm, stock-badge placement — composition only, no new data fetched |
| `components/StickyMobileBuyBar.tsx` | Modify | Add `BuyNowButton` (already exists, already used on desktop Buy Box — reused, not duplicated) |
| `cart/CartDrawer.tsx` | Modify | Insert free-shipping progress + cross-sell rail into existing dead space |
| **`cart/FreeShippingProgress.tsx`** | **New** | Reads real `StorefrontBranding`-adjacent Appearance field (once added) — renders nothing if unset |
| **`cart/CartRecommendations.tsx`** | **New** | Thin wrapper around the existing `getRecommendations()` gateway call + existing `ProductGrid`/`ProductCard` — reused rendering, new data-fetch composition only |
| `app/cart/page.tsx` | Modify | Consumes the same new `CartRecommendations` — not a second implementation |
| `checkout/CheckoutForm.tsx` | Modify | Section-complete visual state, trust-row reuse, mobile sticky-summary — zero business logic touched |
| `checkout/success/page.tsx` | Modify | Visual celebratory treatment, consumes `CartRecommendations` |
| `components/StoreHeader.tsx` | Modify | Announcement bar visual pass, cart-icon micro-interaction, reserved (empty) slot for future Wishlist/Compare/Language |
| `components/CategoryBanner.tsx` | Modify (confirm/strengthen) | Ensure real image/description are actually rendered with intended prominence |

---

## 8. No duplicated components — confirmation

Explicit, per the brief's own "Do NOT duplicate components" instruction:

- **Cross-sell in Cart Drawer and Cart page**: one new `CartRecommendations` component, consumed by both — not built twice.
- **Trust/payment/courier rows on PDP, Cart, and Checkout**: all three already reuse (or will be updated to reuse) the exact same `PaymentMethodsRow`/`CourierBadge`/`TrustBadge` components Pack 1 established — no new trust-row component is proposed anywhere in this plan.
- **Buy Now on desktop Buy Box and the sticky mobile bar**: the exact same `BuyNowButton` (already built in Pack 1) is reused, not reimplemented for the mobile bar.
- **`getRecommendations()`**: the single real Gateway recommendations call already used on Homepage/PDP/Category is the same call `CartRecommendations` and the Success-page rail will use — no second recommendations pathway.
- **Price display**: `PriceBlock` remains the single price-rendering component everywhere (card, PDP, cart, checkout) — this sprint changes its honest-empty-state *treatment*, never forks a second price component.
- **No second cart implementation**: `CartDrawer` and `/cart` continue to share the exact same `useCart()`/`cartStore.ts` state and the same `CartLineItemRow`/`CartSummary` — this plan adds to both consistently, never diverges them.

---

## 9. Performance impact analysis

Every item in §3 is presentation, composition, or a real-but-small new data read (`getRecommendations`, already a proven, cached, revalidated call pattern used three times today). Concretely:

- **No new client-side JS libraries.** No animation library, no carousel library, no state-management addition. Micro-interactions (cart-icon pulse, section-complete state) are CSS transitions/transforms, consistent with this codebase's existing `duration-fast`/`duration-slow` motion tokens and its established `prefers-reduced-motion` discipline.
- **No new Client Component boundaries beyond what's already necessary.** `FreeShippingProgress`/`CartRecommendations` read from the same client-only cart/gateway boundary `CartDrawer` already crosses — no new Server/Client split risk (the same discipline `client.ts`'s own docblock already enforces is followed, not reinvented).
- **No layout shift risk**: every visual change is either (a) restyling an existing, already-sized element, or (b) a new element inside a container that already reserves space in its honest-empty state today (e.g., the Cart Drawer's own current dead space is literally where the cross-sell rail goes — filling empty space, not pushing content).
- **SSR/SEO unaffected**: Homepage/Category/PDP remain real Server Components with the same `revalidateSeconds` ISR pattern; none of the proposed changes add a client-side data fetch to a currently-static route. The one new data call (`getRecommendations` inside the Cart Drawer/Cart page) is already client-side today by necessity (the cart itself is `localStorage`-only) — no regression.
- **Code splitting preserved**: new components (`ProductBadgeSlot`, `FreeShippingProgress`, `CartRecommendations`) are additive named exports from the existing `storefront-engine` barrel(s), following the exact `index.ts`/`client.ts` split already established — a Server-safe component goes in the main barrel, a client-only one in `/client`, never both.
- **Bundle-size discipline**: badge-slot and progress-bar components are expected to each be under 1KB gzipped (plain divs/conditionals over existing `@nexgen/ui` primitives) — no measurable First Load JS regression expected against Pack 1's own confirmed sub-200KB baseline.

---

## 10. Implementation order

Phased so that shared infrastructure is built once, before the pages that consume it — and so the highest-priority, lowest-effort items (per §4) land first.

**Phase 0 — Shared infrastructure (build once)**
- `ProductBadgeSlot` (feeds Product Card + PDP)
- `CartRecommendations` (feeds Cart Drawer + Cart page + Success page)
- Confirm the one-line backend contract for an optional order-note field (item 27) *before* building its UI — or drop it from this pass if that confirmation isn't available yet.

**Phase 1 — Highest priority-score items (§4)**
- PDP CTA hierarchy (item 19)
- Buy Now on sticky mobile bar (item 23)
- Mobile tap-target/layout-shift QA pass (items 36–37, run continuously, not just at the end)
- Search dead-end restyle (item 11)
- TrustBar reposition + PromotionBanner treatment (items 4–5)

**Phase 2 — Cart Drawer AOV rebuild**
- Free-shipping progress bar (item 24) — contingent on confirming the Appearance-schema field addition is acceptable within this sprint's "existing architecture" bound
- Cross-sell rail in Drawer + Cart page (items 25, 29)
- Unified total narrative (item 26)
- Delivery-estimate reassurance (item 28)

**Phase 3 — Product Card v4 + Category page**
- Badge slot rollout (item 16), visual identity pass (item 17), honest-price-state treatment (item 18)
- Category page count/separation/banner (items 13–15)
- Mega-menu thumbnails (item 10)

**Phase 4 — Homepage rebuild**
- Hero (items 1–2), rail hierarchy (item 3)
- (Depends on Phase 3's Product Card v4 already being live, since the homepage rails render that same card)

**Phase 5 — Checkout & Success polish**
- Section-complete state + trust-row reuse (items 31–32)
- Mobile sticky order summary (item 33)
- Success-page delight + recommendation rail (items 34–35)

**Phase 6 — Header/Nav finishing touches**
- Announcement bar, cart micro-interaction, reserved slots (items 7–9)

**Explicitly deferred out of this sprint, named not silently dropped:**
- Real pricing/Gateway composition (the governing constraint, above)
- Real search results page
- Demo Mode (item 38) — needs its own scoping decision first
- Reviews, Wishlist, Compare, Account — no backend exists; unchanged from Pack 1's own honest deferral list

---

## Final check, per the brief's own instruction

Every item above was tested against: *"Will this help merchants sell more?"* Where the honest answer was "not clearly" or "only if we fabricate data to support it," the item was left out. This document proposes 38 concrete changes; every one is either already-real-data-driven or explicitly, visibly gated behind data that does not exist yet.

**Awaiting review and approval before any implementation begins.**
