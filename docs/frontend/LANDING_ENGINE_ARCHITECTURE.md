# neXgen Core — Landing & Funnel Engine Architecture

| Field | Value |
|---|---|
| **Status** | **Draft — Proposed, pending Product Owner review** |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 |
| **Phase** | Pre-2.2 Customer Experience Platform architecture pass — architecture only, per the governing instruction ("DO NOT IMPLEMENT... Design it") |
| **Builds on** | `STORE_FRONTEND_ARCHITECTURE.md`, `docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`, `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`, `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md`, the real Checkout/Promotions/Orders backend confirmed this research pass |
| **Named as** | A flagship neXgen capability, per the Product Owner's own framing — designed to be genuinely better than CartFlows, Funnelish, GemPages, PageFly, and Zipify, not a clone of any of them |

---

## 1. Reconciling This Document With `VISION:NON_GOALS`

`01_PRODUCT_VISION.md`'s own non-goal states plainly: *"neXgen Core will not become a website builder wearing operational software as a feature... This rules out prioritizing storefront themes and page builders over operational depth."* A flagship Landing Engine has to answer that directly, not quietly hope it doesn't apply.

**It doesn't apply here, and the reason is the entire design thesis of this document**: every competitor named below is a page-builder-as-product — a visual editor bolted onto someone else's commerce engine, with no real knowledge of that engine's actual price, actual stock, or actual discount logic. neXgen's Landing Engine is the opposite shape: it has **no commerce logic of its own at all**. Every price, every discount, every stock check, every order it ever shows or creates is a real call into the real Pricing, Promotions, Inventory, and Checkout modules this platform already built and froze (Phase 2.4–2.9). The Landing Engine's entire job is composing the Storefront Component Engine's own primitives (`STOREFRONT_COMPONENT_ENGINE.md`) and the real backend's own operational depth into a page optimized for one outcome — conversion — using content tooling (`CMS_FOUNDATION_ARCHITECTURE.md`) this platform already designed for exactly this purpose. It is "operational depth, presented for conversion," not "a page builder the operational depth was bolted onto afterward." §3 makes this literal, section by section.

---

## 2. Competitive Research — Where the Incumbents Actually Fail

This is public, well-documented behavior of each named tool's own architecture, not proprietary research:

| Tool | Real architecture | Where merchants actually get hurt |
|---|---|---|
| **CartFlows** | A WordPress/WooCommerce plugin generating funnel steps as ordinary pages, built with Elementor/Gutenberg/Divi blocks | The funnel step and WooCommerce's real cart/pricing engine are two separate systems kept in sync by plugin glue, not one system — a stale cache, a conflicting plugin, or a theme update can silently desync what a funnel step shows from what WooCommerce will actually charge. Builder-generated markup (deeply nested divs per widget) measurably hurts Core Web Vitals, directly undermining the paid-traffic economics a funnel exists to protect. |
| **Funnelish** | A standalone SaaS, connected to Shopify/WooCommerce via app integration, not native to either | Inventory and pricing are synced, not shared — there is an inherent, if usually short, lag between what Funnelish shows and what the store's real state is. Migrating away means rebuilding every funnel from scratch in the proprietary builder format; nothing is portable. |
| **GemPages / PageFly** | Shopify page builders — pure visual editors that render a page; Shopify's own checkout still does the actual pricing/discount math separately | Neither tool has any real knowledge of Shopify's discount/promotion engine at page-render time — a page can visually promise a deal that a specific customer's cart doesn't actually qualify for, discovered only at checkout. Every added "app block" (upsell app, reviews app, urgency-countdown app) is a separate script tag; page weight and third-party-script security surface both grow linearly with feature count. |
| **Zipify (Pages / OneClickUpsell)** | Shopify-native but historically bound by Shopify's own (until recently limited) checkout extensibility — pages and upsells frequently live as separate flows around checkout rather than genuinely inside it | Post-purchase upsells commonly require a second charge event bolted on after the "real" order completed, a materially worse trust and reconciliation story than a true single-checkout order. Reporting is app-local — a merchant reconciles Zipify's own funnel dashboard against Shopify's real order data by hand. |

**The pattern across all four**: the builder and the commerce engine are architecturally two different systems. Every specific failure above — price drift, stock drift, page bloat, disconnected reporting, non-portable content, bolted-on upsells — is a direct structural consequence of that split. neXgen's Landing Engine is designed from §3 onward to never have that split exist in the first place, because there is no second system.

---

## 3. Architecture — One System, Not a Bolt-On

### 3.1 A Landing/Funnel Page is a CMS Page. Full stop.

No new content model. A "landing page" is a `Page` (`CMS_FOUNDATION_ARCHITECTURE.md` §2), composed of the exact same `Section`/`Block`/`Widget` tree, rendered by the exact same Storefront Engine (`THEME_ENGINE_ARCHITECTURE.md` §2.2), themeable by the exact same Theme Package mechanism, and served by the exact same rendering strategy (`STORE_FRONTEND_ARCHITECTURE.md` §2) as a Product Detail or Category page. This is the single biggest structural difference from every incumbent in §2: there is no separate "funnel page" system to desync from the real store, because a funnel page **is** the real store, arranged differently.

A "Funnel" is simply a small, explicit, ordered chain of Page references plus routing rules (§3.4) — not a new rendering system.

### 3.2 Instant Checkout / One-Page Checkout

Both are the real `MODULE:CHECKOUT` backend (`StartCheckoutAction`, item/address/coupon mutation Actions, `ReviewCheckoutAction`, `SubmitCheckoutAction` — all confirmed real, already frozen), presented through a denser Template (§6 of `THEME_ENGINE_ARCHITECTURE.md`) that collapses what the default multi-step Checkout route (`STORE_FRONTEND_ARCHITECTURE.md` §1.1's `/checkout`) shows across several visual steps into one scroll, and pre-populates the cart with the Landing Page's own promoted product before the visitor ever sees an empty cart. **No new checkout logic is invented** — "One Page Checkout" is a Section-composition and layout decision (§6's Template concept), never a second implementation of cart/price/tax/discount calculation. This is the direct fix for GemPages/PageFly's "page promises a deal checkout doesn't honor" failure mode: because Instant Checkout *is* Checkout, not a preview of it, what a landing page shows a visitor is, by construction, exactly what `SubmitCheckoutAction` will actually charge.

### 3.3 Order Bumps, Upsells, Downsells

Modeled as **CMS `Widget`s** (`CMS_FOUNDATION_ARCHITECTURE.md` §2.3) embedded inside the Checkout review Section, each configured with a target product/variant and — critically — resolved through the real `Actions\AddCheckoutItemAction` at the moment a visitor accepts the offer, inside the *same* `CheckoutSession` (confirmed real model: `Models\CheckoutSession`, one `grand_total` recomputed atomically per mutation) — never a second cart, never a second charge event. This is the direct fix for Zipify's "post-purchase upsell as a bolted-on second charge" failure: a neXgen order bump/upsell is accepted *before* `SubmitCheckoutAction` ever runs, so it is simply one more line item on the one real order that gets created once, submitted once, and paid for once.

A **downsell** (offered only after an upsell is declined) is a Section-level branch — the Storefront Engine renders a different Widget conditioned on the visitor's own prior in-session choice (client-local UI state, `ADR-0005`'s Zustand-equivalent pattern for the storefront), never a second page or a second checkout flow.

### 3.4 Split Testing

Proposed extension to the CMS content model (not built, named as a concrete, additive schema change so it is never bolted on informally later):

```ts
interface Section {
  // ...CMS_FOUNDATION_ARCHITECTURE.md §2.1's existing fields...
  variant?: { group: string; weight: number }; // e.g. { group: "hero-a", weight: 50 }
}
```

A visitor is assigned a variant group **once**, server-side, at first request (a signed, HttpOnly cookie set by the BFF — `STORE_FRONTEND_ARCHITECTURE.md` §3.3's same session-cookie mechanism, not a client-side pixel-based split that iOS ATT / third-party-cookie deprecation has made unreliable industry-wide, per §2's own diagnosis of the incumbents' weak-statistics failure mode). Because assignment happens in the BFF rather than client JavaScript, variant assignment survives ITP/ATT-class privacy restrictions that materially degrade every incumbent's own client-only split-testing accuracy today — a real, defensible "beat them" claim, not a marketing one.

Statistical significance calculation and the actual Conversion Dashboard UI are named as a required capability here but are **out of this document's own scope** — they belong to the Growth-domain Reporting/Analytics module (`04_MODULE_ARCHITECTURE.md` §7, `IMPLEMENTATION_MASTER_PLAN.md` §28) once it exists, consuming the real events named in §3.6, never a Landing-Engine-local, disconnected dashboard (directly avoiding Zipify's own "reconcile two dashboards by hand" failure).

### 3.5 Campaign Tracking — Meta, Google, TikTok

Two layers, deliberately:

1. **Client-side pixels** — standard, unavoidable for retargeting-audience building; unchanged from how every incumbent already does this.
2. **Server-side events (CAPI/Conversions API equivalents)** — fired from the BFF (`STORE_FRONTEND_ARCHITECTURE.md` §3), at the moment `CheckoutCompleted`/`OrderPlaced` (real, already-published domain events) actually occur, using the real order's own `grand_total`/`currency_code` — never a client-estimated value. This is the direct, named fix for the single biggest tracking-accuracy complaint against every incumbent in §2: client-only pixel tracking has degraded significantly under Safari ITP, Firefox ETP, and iOS App Tracking Transparency; a server-side event fired from a trusted backend process, keyed to a real completed order, is resilient to all three in a way no purely client-side funnel tool is by construction.

### 3.6 Analytics & Conversion Dashboard — One Truth, Not Two

The real Checkout module already publishes `CheckoutStarted`, `CheckoutAbandoned`, and `CheckoutCompleted` (confirmed real events, `Events/CheckoutStarted.php` et al.) — a genuine, already-instrumented funnel is sitting in this backend's own event stream today, unused by any admin surface built so far. A Conversion Dashboard (Growth-domain Reporting, not this document's own scope to build) consuming these three events plus `PromotionApplied`/`CouponRedeemed` (real, Marketing module) and `OrderPlaced` (real, Orders module) produces a genuine, single-source-of-truth funnel view (visits → checkout started → completed, discount attach rate, upsell attach rate) with **zero new backend instrumentation required** — every event this needs already exists. This is the direct fix for every incumbent's "funnel dashboard disconnected from real store data" failure named in §2.

### 3.7 Dynamic Offers

A Section's `configuration` (§`CMS_FOUNDATION_ARCHITECTURE.md` §3's Schema-validated shape) may reference a real, already-evaluated Promotion (via the real, confirmed `EvaluatePromotionsAction` — read-only, non-mutating, already used by the admin's own Promotion Tester tool per this engagement's prior work) rather than a hardcoded discount value — so a landing page's own "Save 20% today" banner is never a copywriting decision divorced from whether the visitor's actual cart would really receive that 20%. This is the same structural fix as §3.2, applied to promotional messaging specifically.

---

## 4. Template System & Visual Builder — Architecture, Not Implementation

- **Template System**: not a separate mechanism — `THEME_ENGINE_ARCHITECTURE.md` §6's `ThemeTemplate` concept (added by this same architecture pass) already covers a landing-page archetype (`archetype: 'landing'` is an additive value to that same enum) with its own default Section arrangement a merchant starts from.
- **Visual Builder**: named as required by the master task, explicitly **not designed here** beyond stating its own required property, matching `CMS_FOUNDATION_ARCHITECTURE.md` §7's own precedent ("No visual editor... a real, separate, substantial piece of work for a later phase"): any future visual builder must be a *pure editing surface over the real Schema-validated Section/Block/Widget model* (§`CMS_FOUNDATION_ARCHITECTURE.md` §3's Zod Schema is what such an editor would render as a configuration form) — it must never introduce a second, builder-proprietary content representation that the Storefront Engine does not already know how to render. This single constraint is what prevents neXgen's own future builder from ever developing GemPages/PageFly's own "proprietary block format, non-portable content" failure mode.

---

## 5. Future AI Optimization (named, not designed)

A named future extension point only, per the master task's own instruction — AI-assisted copy generation, AI-suggested Section ordering, and AI-driven split-test winner selection all consume the same real event stream §3.6 already establishes (no separate AI-specific instrumentation required) and attach through the Extension System (`MODULE:EXTENSIBILITY`, `04_MODULE_ARCHITECTURE.md` §12), consistent with `VISION:NON_GOALS`'s "AI capability is additive, never load-bearing for core commerce operation."

---

## 6. What This Document Deliberately Does Not Do

- Does not design the Visual Builder's own UI, drag-and-drop interaction model, or editing UX — named in §4 as required, deferred as substantial future work.
- Does not design the Conversion Dashboard's own screens — named in §3.4/§3.6 as consuming already-real events, deferred to the Growth-domain Reporting module's own future architecture pass.
- Does not invent any new backend capability — every commerce behavior in §3 (checkout, upsell, discount, order) is a real, already-built, already-frozen backend Action or event; this document composes and presents them, per §1's own thesis.

---

End of Document
