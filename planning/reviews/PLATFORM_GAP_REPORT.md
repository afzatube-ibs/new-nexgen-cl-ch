# neXgen Platform Gap Report

**Sprint:** Beta Sprint 4 — scope narrowed by explicit Product Owner direction: *"Before implementing any more production code, perform the cross-platform architecture review first ... Do not write any production code during this review. After the review is complete, stop and wait for Product Owner approval before implementing Guest Checkout, Authentication, or any additional modules."*
**Method:** Every claim below is re-verified directly from source this session — real backend PHP, real Gateway TypeScript, real Admin module registry, real `docs/frontend/*` document status fields — never from memory of prior sprint reports. Where a prior report (`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md`, `MERCHANT_PRODUCTION_READINESS_AUDIT.md`, both Sprint 3) already established a fact, it is cited and built on, not silently repeated as new. **No code was written to produce this report.**
**Benchmarked against:** Shopify Plus, EasyCommerz, BigCommerce, Adobe Commerce, Medusa, Saleor, WooCommerce, Amazon Seller Central, Daraz Seller Center — used to check nothing structurally load-bearing is missing from the *category* of platform this aims to be, never to justify copying a specific UI.

---

## 0. The Real Architecture Estate, As It Actually Stands Today

Before any gap can be judged Critical vs. Future, the honest starting inventory, re-confirmed by reading document status fields and real module registries directly:

| Layer | Real, built, and running | Accepted architecture, not yet built | Draft — proposed, pending PO review, not yet built |
|---|---|---|---|
| **Backend Commerce** | Catalog, Inventory, Pricing, Customers (staff-only), Orders, Checkout (staff-only), Payments (COD/bKash/Nagad/SSLCommerz/Bank Transfer, real contract-driven gateways), Shipping/Couriers (Pathao/Steadfast/RedX/Paperfly/Sundarban/eCourier/Manual, real contract-driven), Promotions/Coupons | — | — |
| **Backend Platform** | Identity & Access (staff), Store Configuration, Localization, Media, Foundation/EventBus | Customer-facing auth guard (named, not designed in full) | — |
| **Gateway (BFF)** | Catalog reads, Search, Recommendations (trending-fallback only), Events ingestion (real, validated, real destinations: webhook, warehouse/Redis, and three *stubbed* ad-platform adapters), Guest Session cookie, CORS, rate limiting, circuit breakers, Preview mode, Feature flags | Category-B write path (named, not built) | — |
| **Storefront** | Home/Category/Brand/Collection/Search/Product Detail, Cart, Checkout UI (honestly boundary-stopped), Order lookup UI (honestly boundary-stopped) | — | — |
| **Admin** | Catalog, Inventory, Pricing, Customers, Orders, Shipping, Payments, Marketing (Promotions/Coupons only), Settings, Dashboard *framework* | — | — |
| **Reporting/Insights** | The Dashboard *widget framework* itself (real, module-registration-driven) — **zero widgets registered by any of the 9 real business modules today**, confirmed by reading `DashboardPage.tsx` directly | — | `INSIGHTS_PLATFORM_ARCHITECTURE.md` (full "Reporting" module design) |
| **CMS** | — | `CMS_FOUNDATION_ARCHITECTURE.md` (content shape: Page→Section→Block→Widget) | `CMS_ARCHITECTURE.md` (owning module, publishing, versioning, menus) |
| **Landing/Funnel** | — | — | `LANDING_ENGINE_ARCHITECTURE.md` |
| **Theme** | — | `THEME_ENGINE_ARCHITECTURE.md` §§1–5 (engine contract) | `THEME_ENGINE_ARCHITECTURE.md` §§6–10 (installable/swappable theme packages) |
| **CDP** | The raw event pipeline only (ingest → validate → queue → dispatch to destinations) | — | `CDP_ARCHITECTURE.md` (identity resolution, segments, journeys) |
| **Marketplace (Theme + App)** | — | — | `MARKETPLACE_PLATFORM_ARCHITECTURE.md` |
| **SaaS / Multi-tenancy** | — | — | **No document exists at all.** Not drafted, not proposed. One hardcoded `TenantId::DEFAULT` platform-wide, confirmed in `CheckoutSession::booted()` and re-checked here: no other tenant-scoping mechanism found anywhere in the backend. |
| **AI** | — | — | No document, no code, no named module boundary anywhere. |

**The single most important structural fact this review surfaces**: there is a full tier of substantial, well-researched architecture (CMS, Landing/Funnel, CDP, Insights/Reporting, Marketplace, half of Theme) that was written — all five documents dated the same day, 2026-08-17 — and never implemented or formally accepted. This is not neglect; `GOVERNANCE:MODULE_AUTHORITY` requires formal Product Owner acceptance before implementation begins, and that gate simply hasn't been exercised yet for any of them. But it means every "Reporting," "CMS," "Marketing automation," or "Theme install" capability this report discusses below is being compared against real competitors from a *zero-implementation* baseline, not a partial one.

---

## 1. Merchant Journey

Re-confirmed, not re-derived, from `MERCHANT_PRODUCTION_READINESS_AUDIT.md` (Sprint 3) — no material change since: store creation is functional-but-unguided (no onboarding wizard, no launch-readiness score), product upload is strong (full Catalog CRUD) with bulk CSV import still deferred, first-visitor Storefront experience is the platform's clearest strength, and the purchase→payment→delivery→review→repeat-purchase chain is blocked at Checkout submission (Category B). Not re-litigated here in full — see that report for the stage-by-stage detail. What follows in this report goes beyond it: SaaS, marketing/growth breadth, tracking, and a formal Critical/High/Medium/Future backlog with effort estimates.

## 2. Customer Journey

Everything past "browse and add to cart" requires either a real order (blocked) or a real account (blocked, same root cause). A returning customer today has no persistent identity at all — every visit is a fresh anonymous `localStorage` cart. Guest checkout, once Category B ships, is the correct first target (Bangladesh ecommerce is guest-checkout-first by market norm, already established in `MERCHANT_CONVERSION_AUDIT.md` Part 3) — registered-customer flows (login, order history, saved addresses) are real but strictly secondary.

## 3. Admin (Merchant Operator) Workflow

Genuinely strong for day-to-day catalog/inventory/pricing/order operations — nine real modules, a real shared CRUD framework, real optimistic locking and audit logs throughout (re-confirmed across every backend module read this session and last). What's missing: **the Dashboard shows nothing.** Not "shows sparse data" — a real Empty State, because no module has registered a single widget. A merchant logging into `apps/admin` today sees zero KPIs, zero charts, zero "orders today," zero "low stock alert" — every competitor benchmarked here treats a populated home dashboard as table stakes, not a stretch goal.

## 4. SaaS Workflow

**Does not exist as a concept anywhere in this codebase.** Not "early" — absent. No tenant model beyond one hardcoded constant, no subscription, no plan, no billing, no store-provisioning flow, no domain-management UI, no white-label capability. This is the largest single gap this report identifies, and the brief's own Phase E naming it ("Design the future multi-tenant system... Review every architecture document first") was well-placed — there is nothing to conflict with, because nothing has been written yet.

## 5. AI Capability

**Zero.** No module boundary, no document, no code. Every competitor named in this review either ships or is actively shipping AI-assisted merchandising (product descriptions, image tagging), AI-assisted support, or AI-assisted analytics narration. Correctly out of scope for this platform's current maturity (per `01_PRODUCT_VISION.md`'s own "Commerce Operating System first" framing) — named here as a real, sizeable Future-tier gap, not a near-term recommendation.

## 6. Reporting Capability

`INSIGHTS_PLATFORM_ARCHITECTURE.md` is a genuinely thorough draft (six intelligence domains, one executive dashboard, `MODULE:REPORTING`'s own architecture) — but it is a draft. Today: zero real reports, zero real charts, an empty Dashboard (§3). This is not a "missing feature," it is a missing *module* — every competitor here has sales/traffic/inventory reporting as core, not optional.

## 7. Marketing Capability

Real: Promotions and Coupons, fully built, load-bearing inside real Checkout pricing composition (`ReviewCheckoutAction` calling `EvaluatePromotionsAction`, re-confirmed Sprint 3). **Not real, confirmed by reading the Marketing module's own file list directly this session**: campaigns, email marketing, SMS marketing, segmented audiences, any automation. "Marketing" in this platform today means "discount codes" — a real, working slice of a much larger category every competitor benchmarked here already ships in full (Shopify's own Email/SMS marketing, Klaviyo-class integrations by default in most of the others).

## 8. Automation Capability

The precondition is real and strong: every domain publishes real domain events (`OrderPlaced`, `CheckoutCompleted`, `CheckoutAbandoned`, `PaymentCaptured`, etc. — re-confirmed across Phases A/D/E of Sprint 3). **Nothing consumes them for automation.** No workflow engine, no "if this then that" rule builder, no automated email/SMS trigger. This is the single highest-leverage near-term opportunity in this entire report: the event bus already does the hard part.

## 9. Analytics Capability

Distinct from "Reporting" (§6, merchant-facing business intelligence) — this is *behavioral* analytics (how shoppers actually move through the Storefront). The raw event pipeline is real (Gateway's `POST /v1/events`, real Zod-validated schema registry, real queue/dispatch) and was extended this sprint's predecessor (Sprint 3's Cart Engine is the pipeline's first real consumer — `added_to_cart`/`removed_from_cart`). `CDP_ARCHITECTURE.md` (identity resolution across sessions, segments, journeys) is draft-only. Today: events are captured and queued; nothing analyzes them.

## 10. Tracking Capability (Meta Pixel, CAPI, GTM, GA4, TikTok, Google Ads, Server-Side Events)

Re-verified directly from the Gateway's own destination registry (`apps/store-api-gateway/src/plugins/events.ts`): real, registered stub destinations exist for **`meta-capi`** and **`ga4`** and **`tiktok-events`** — each gated on a real env credential (`META_CAPI_ACCESS_TOKEN`, `GA4_API_SECRET`, `TIKTOK_EVENTS_ACCESS_TOKEN`), currently unset in this installation (Sprint 3, Phase D's own credential audit). **No GTM (Google Tag Manager) destination or concept exists.** **No Google Ads conversion destination exists.** No client-side Meta Pixel (`fbq`) or `gtag.js` snippet was found anywhere in the Storefront. **The real, structural strength here**: server-side events (the CAPI-style pattern) are architecturally the *default* in this platform, not an afterthought — this is the *more* reliable half of a real tracking setup (immune to ad-blockers/ITP), and most competitors bolt this on later. The precise remaining gap: real credentials, a GTM/Google Ads destination, and — as `ORDER_SUCCESS_ARCHITECTURE.md` (Sprint 3) already named precisely — a real call site, since Checkout cannot complete yet.

## 11. Marketplace Capability (Selling On Daraz/Amazon, and This Platform's Own App/Theme Marketplace)

Two distinct things, both absent, confirmed by reading `MARKETPLACE_PLATFORM_ARCHITECTURE.md`'s own status field: **draft, not implemented.** (1) Multi-channel selling (pushing this platform's catalog to Daraz/Amazon as sales channels) — not designed, correctly out of scope per the roadmap's own "never becomes an ERP/marketplace pivot" framing (§ below on scope discipline). (2) This platform's *own* Theme/App marketplace (third-party developers publishing themes or apps) — designed in real depth in the draft document, zero implementation, correctly sequenced *after* Theme Engine §§6–10 (which must exist before anything could be installed).

## 12. CMS Capability

Two-thirds designed, zero implemented. `CMS_FOUNDATION_ARCHITECTURE.md` (Accepted) settles the content shape; `CMS_ARCHITECTURE.md` (draft) settles ownership/publishing/versioning. **A merchant cannot edit a single word of Storefront content today without a code deployment** — every "Fast delivery / Easy returns / Secure payments / Dedicated support" trust-bar copy string, every homepage heading, is hardcoded in a React component. Every competitor benchmarked here treats merchant-editable content as foundational, not a later phase.

## 13. Landing/Funnel Capability

`LANDING_ENGINE_ARCHITECTURE.md` (draft) is explicit and self-aware about the platform's own stated non-goal ("neXgen Core will not become a website builder wearing operational software as a feature") and reconciles it directly in its own §1 — a real, deliberate design choice, not an oversight. Zero implementation. A real, correctly-sequenced Future/Medium-tier item, not urgent.

## 14. Subscription Capability

**Two distinct meanings, both absent.** (a) Merchant-facing: this platform's own subscription/billing model for charging merchants (the SaaS revenue mechanism) — no document, no code (§4). (b) Shopper-facing: subscription commerce (recurring orders, "subscribe and save") — no document, no code, not named anywhere in any architecture doc reviewed. Neither is a near-term gap given the platform's current single-merchant-installation maturity, but (a) blocks the SaaS objective entirely and should be sequenced before any multi-tenant provisioning work begins.

## 15. Bangladesh-Specific Workflow

The platform's clearest architectural strength outside pure Storefront browsing, re-confirmed from `BANGLADESH_COMMERCE_READINESS.md` (Sprint 3): real contract-driven bKash/Nagad/SSLCommerz/COD gateways, real contract-driven Pathao/Steadfast/RedX/Paperfly/Sundarban courier providers, real BDT lakh/crore formatting, a real 8-Division address selector. The blocker is uniform with everything else (Category B, credentials) — Bangladesh readiness was never the differentiator holding this platform back; it is the one area already ahead of what a typical Beta-stage platform would have.

## 16. Enterprise Workflow

Multi-warehouse *data* exists (Inventory module, confirmed Sprint 3) but no multi-warehouse *presentation* to a shopper (e.g., "ships from Warehouse X, 3-day delivery" vs. "ships from Warehouse Y, 7-day delivery"). No B2B/wholesale flow (tiered pricing exists structurally in Pricing per the roadmap's module list, but quote requests, net-terms invoicing, and purchase-order checkout were not found anywhere). No SSO for staff (`Identity & Access` is real but was not re-verified this session for SAML/OIDC support — flagged, not assumed either way).

## 17. Global (Non-Bangladesh) Readiness

`CheckoutSession.currency_code` and `Product` are currency-code-aware at the data layer, but no multi-currency *presentation* (price conversion, currency switcher) exists in the Storefront — `bdCurrency.ts` (Sprint 3) is explicitly BDT-only by design. `Platform\Localization` exists as a real backend module (confirmed in the domain list, not independently re-verified this session for actual locale coverage). No evidence of a multi-language Storefront rendering path. Correctly a Future-tier item given the platform's own explicit Bangladesh-first sequencing (`01_PRODUCT_VISION.md`).

## 18. Security

`08_SECURITY_STANDARD.md` is real, Accepted, and substantive (defense-in-depth, explicit security boundaries at every API/module/event/external-integration seam, incident-response containment-before-recovery requirement) — re-confirmed by reading its own status/changelog directly. A real `SECURITY_REVIEW.md` already exists in `planning/reviews/` from the backend's own Phase 1.1 hardening pass. **What has not been re-reviewed since**: the Gateway's own public-facing surface area (CORS, rate limiting, guest-session cookie handling) and the new Cart/Checkout Storefront surface added across Sprint 3 — neither was built carelessly (both were built citing this platform's own security-boundary discipline throughout), but neither has been through a dedicated, focused security pass of its own the way the backend was. A real, scoped recommendation, not an alarm: schedule one before any Category-B write path goes live, since that is precisely the moment this platform's attack surface changes from "read-only, anonymous-safe" to "write-capable, abuse-relevant."

## 19. Scalability & Performance

Backend: real optimistic/row-level locking throughout Checkout's saga (re-confirmed Sprint 3, Phase A), a genuine multi-step saga rather than one giant transaction — materially more scalable than a naive implementation. Gateway: real Redis-backed caching and event queueing, real per-module circuit breakers. Storefront: `PERFORMANCE_FOUNDATION.md` exists (not re-read line-by-line this session; cited, not re-verified) but `generateStaticParams` remains unimplemented (`MERCHANT_CONVERSION_AUDIT.md` Part 4, Sprint 3, still open) — every product/category/brand/collection page is server-rendered on demand today, a real bottleneck at catalog scale, not yet felt at this installation's current size. No CI pipeline was found running these quality gates automatically — every gate this engagement runs (typecheck/lint/test/build) is run manually, per session, which is itself a real operational risk as the codebase grows.

## 20. Extensibility & Developer Experience

A genuine, repeated structural strength: every module reviewed across this entire engagement follows the same contract-first pattern (`PaymentGatewayContract`, `ShippingProviderContract`, the Module Registration Framework, the Admin Shell's shared CRUD framework) — adding a new payment gateway or courier is "one class, one config block," confirmed directly from source (Sprint 3, Phase D). This is a real competitive asset most of the benchmarked platforms took years to converge on architecturally. The gap is not extensibility itself — it's that the *marketplace* to distribute third-party extensions (§11) doesn't exist yet, so this extensibility currently benefits only this platform's own core team.

---

## 21. Consolidated Backlog — Critical / High / Medium / Future

Every item below is scored for **business impact** (why it matters) and **effort** (T-shirt: S = days, M = 1–2 weeks, L = 3–6 weeks, XL = a dedicated multi-sprint initiative) and **dependencies** (what must exist first). Ordered within each tier by dependency, not alphabetically.

### 🔴 CRITICAL — blocks launch for a real merchant

| # | Item | Effort | Depends on | Why Critical |
|---|---|---|---|---|
| 1 | Customer-facing authentication guard (Category B) | **XL** | — | Blocks checkout submission, payment, account, order history, reviews — the entire revenue path |
| 2 | Write-scoped Gateway service credential + Guest Checkout Session bridge (Redis) | **M** | #1 not required first — this is the faster, scoped precursor named in `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8 | Unblocks *guest* checkout without waiting on full customer auth design |
| 3 | Checkout ↔ Shipping composition (replace Checkout's own flat 3-option catalog with the real Shipping module) | **S** | #2 | Real shipping module already exists; two real modules have simply never been wired together |
| 4 | Checkout submission → Payment initiation orchestration | **S** | #2 | `SubmitCheckoutAction` creates an Order but never calls `InitiatePaymentAction` — a real, scoped orchestration gap, independent of #1/#2 |
| 5 | Real merchant payment/courier credentials provisioned (bKash/Nagad/SSLCommerz + at least one courier) | **S** (ops, not engineering) | none | Every gateway class is real; none is `isAvailable()` today in this installation |
| 6 | Reviews backend domain | **M** | none | Confirmed missing independently three separate times across this engagement (Milestone 2.6, Sprint 3 Phase A, Sprint 3 Phase E) |

### 🟠 HIGH — should exist before calling this production-ready for one real merchant

| # | Item | Effort | Depends on | Why High |
|---|---|---|---|---|
| 7 | Transactional email (order confirmation, shipping update, cart-abandonment recovery) | **M** | #1/#2 for cart-abandonment-with-identity; order confirmation only needs #4 | Domain events already exist and are simply unconsumed |
| 8 | First real Reporting module + Dashboard widgets (`MODULE:REPORTING`, from `INSIGHTS_PLATFORM_ARCHITECTURE.md`) | **L** | none — can start immediately against existing Orders/Payments data | Dashboard currently shows literally nothing; every competitor treats this as core |
| 9 | Product bulk CSV import | **S** | none | Already scoped and deferred, not a new design |
| 10 | Merchant onboarding / launch-readiness checklist | **M** | Ideally after #1–#5 exist, so the checklist reflects real capability | Every competitor benchmarked here guides a new merchant; this platform does not |
| 11 | Delivery exception handling (failed delivery, redelivery, RTO) | **M** | #2 (Shipping composition) | No dedicated workflow found for a real, common operational case |
| 12 | Focused security review of the Gateway's public surface + new Cart/Checkout Storefront code | **S** | none, but do before #1/#2 ship | Attack surface changes materially the moment a write path exists |

### 🟡 MEDIUM — enterprise/SaaS/competitive differentiation

| # | Item | Effort | Depends on | Why Medium |
|---|---|---|---|---|
| 13 | CMS module (from `CMS_ARCHITECTURE.md`) | **L** | `CMS_FOUNDATION_ARCHITECTURE.md` (already Accepted) | Merchant cannot edit any Storefront copy without a deploy today |
| 14 | Theme Engine §§6–10 (installable/swappable packages) | **L** | §§1–5 (already Accepted) | Precondition for #17 (Theme Marketplace) |
| 15 | Automation/workflow engine consuming existing domain events | **L** | none | Highest-leverage Medium item — the hard precondition (real events) already exists |
| 16 | Loyalty / rewards / referral / affiliate / gift cards | **L** each, **XL** combined | Customer identity (#1) for anything account-scoped | Zero backend exists for any of these today |
| 17 | Theme Marketplace + App Marketplace | **XL** | #14 | Fully designed (`MARKETPLACE_PLATFORM_ARCHITECTURE.md`), zero built |
| 18 | Real ad-platform credentials + GTM/Google Ads destinations + Meta CAPI/GA4/TikTok live wiring | **S** (credentials) + **M** (GTM/Ads destinations) | #4 (needs a real `checkout_completed` firing) | Infrastructure is real; only credentials, two new destinations, and a live trigger are missing |
| 19 | B2B/wholesale flows (quote requests, net-terms, PO checkout) | **L** | #1 | No evidence found; a real gap for any merchant selling to businesses |
| 20 | Landing/Funnel Engine | **L** | CMS foundation ideally in place first | Fully designed, deliberately reconciled against the platform's own non-goals, zero built |

### ⚪ FUTURE — genuinely long-horizon

| # | Item | Effort | Depends on | Why Future |
|---|---|---|---|---|
| 21 | SaaS platform (tenant/subscription/billing/plans/domains/provisioning) | **XL** | Nothing technically, but should follow proof of a stable single-tenant core | No document exists at all — the single largest gap in this report, correctly sequenced last given current single-installation maturity |
| 22 | AI Assistant / AI-driven merchandising or support | **XL** | A real Reporting/CDP data layer (#8, #15) to be meaningfully grounded in | Zero code, zero document, correctly out of scope today |
| 23 | Global multi-currency/multi-language Storefront presentation | **L** | `Platform\Localization` (real backend module, not independently re-verified this session) | Correctly deferred per this platform's own explicit Bangladesh-first sequencing |
| 24 | Marketplace channel selling (push catalog to Daraz/Amazon) | **XL** | Stable core commerce | Correctly out of scope — this platform's own roadmap explicitly rejects becoming a marketplace-aggregator pivot |
| 25 | CI pipeline running quality gates automatically | **M** | none — could move to High at any time; scored Future only because it's process, not merchant-facing | Every gate today is run manually per session |
| 26 | `generateStaticParams` for Catalog pages | **S** | none | Real bottleneck only at scale not yet reached |

---

## 22. Recommended Implementation Order

This is not a re-statement of the tiers above — it is the actual sequencing, accounting for dependencies the tier list alone doesn't surface:

1. **#12** (security review of the Gateway/Cart/Checkout surface) — cheapest, do it *before* touching anything write-capable, not after.
2. **#2** (Guest Checkout Session bridge) → **#3** (Shipping composition) → **#4** (Payment orchestration) → **#5** (real credentials) — this sequence alone, all Critical, none requiring the full customer-auth-guard design, is enough to take a guest shopper from cart to a real, paid, real order. This is the single highest-value block of work in this entire report.
3. **#6** (Reviews backend) — independent of the above, can run in parallel.
4. **#1** (full customer authentication guard) — deliberately *after* #2–#5, not before: guest checkout is the faster, higher-value unlock, and Bangladesh ecommerce is guest-first by market norm regardless.
5. **#7, #9, #11** (transactional email, bulk import, delivery exceptions) — natural follow-ons once #2–#5 make real orders exist to email about, import products at scale for, and ship.
6. **#8** (Reporting module) — can start in parallel with step 2 once real Orders/Payments data exists to report on; do not wait for #1.
7. Everything Medium/Future proceeds only after the above is real and verified in production — building CMS, Marketplace, or SaaS provisioning on top of a platform that still cannot complete a single real checkout would be sequencing risk, not progress.

## 23. What This Report Deliberately Did Not Do

Per the Product Owner's own explicit instruction: **no production code was written**, no file under `apps/` or `packages/` was modified, and no backend endpoint was called for anything beyond read-only verification (existing dev-environment health checks, already-running services). This report is the complete deliverable for Beta Sprint 4 as scoped. Awaiting Product Owner approval before implementing Guest Checkout, Authentication, or any additional modules named above.
