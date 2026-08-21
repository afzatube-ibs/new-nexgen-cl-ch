# Merchant Production Readiness Audit

**Sprint:** Beta Sprint 3 — Production Commerce Engine, Phase F.
**Method:** The full merchant journey the brief names — *Create store → Upload products → First visitor → Purchase → Payment → Shipment → Delivery → Review → Repeat purchase → Marketing → Reports → Growth* — walked stage by stage against what is verified real in this platform today (Phases A–E of this sprint, plus the real `apps/admin` module registry re-confirmed directly: `dashboard`, `settings`, `catalog`, `inventory`, `pricing`, `customers`, `orders`, `shipping`, `payments`, `marketing`). Benchmarked against Shopify Plus, BigCommerce, Commerce Layer, Saleor, Medusa, EasyCommerz, Daraz Seller Center, and Amazon Seller Central — not to copy their UI, but to check nothing structurally load-bearing is missing from the *category* of platform this aims to be.

---

## Stage 1 — Merchant Creates Store

**Real today**: A staff/admin account exists (`apps/admin`'s own auth, real). Store configuration exists (`settings` module, `Platform\StoreConfiguration` backend domain).
**Missing, benchmarked against the category**:
- **Onboarding wizard / setup checklist.** Shopify, BigCommerce, and Daraz Seller Center all walk a new merchant through a guided first-run (store details → payment → shipping → first product → go live). Nothing here does — a new operator lands in a functional but unguided Admin Shell.
- **Store status / launch-readiness indicator.** No "your store is X% ready to launch" surface exists — this very audit is currently the only thing answering that question, manually.
- **Multi-tenant / multi-store provisioning.** Confirmed in Phase A: exactly one hardcoded `TenantId::DEFAULT` exists platform-wide. Every competitor benchmarked here (except Medusa/Saleor's own self-hosted single-tenant mode) supports at minimum multiple stores per merchant account. Named, not solved — out of this sprint's declared scope, but a real gap for the "later becomes a multi-tenant SaaS" objective.
- **Domain/DNS setup flow.** No custom-domain connection UI exists anywhere.

## Stage 2 — Merchant Uploads Products

**Real today**: Full Catalog CRUD (Brands, Categories, Collections, Tags, Attributes, Options, Products), variant/media/organization/activity tabs (`apps/admin`'s Catalog module, Phase 2.2 Slices 1–2, already delivered), bulk actions, CSV import/export for taxonomy entities, real Pricing module, real Inventory module with stock levels/warehouses.
**Missing, benchmarked against the category**:
- **Product CSV/bulk import** — confirmed, from this session's own earlier plan-mode research, explicitly deferred as a Slice 2+ item ("Products import shown as a disabled 'Coming soon' extension point"). Every competitor here treats bulk product import as table-stakes for a merchant with an existing catalog migrating in.
- **Product feed export** (Google Shopping, Meta Catalog) — no such capability exists. Shopify/BigCommerce ship this natively; Meta/Google feed generation is a real, common Bangladesh-merchant need (`MERCHANT_CONVERSION_AUDIT.md` Part 3 already flags Facebook/Instagram commerce as a real BD channel).
- **AI-assisted product description / image background removal** — explicitly out of scope (no AI module exists or is planned this sprint), named here only as a category feature this platform does not yet have, not a recommendation to build it now.
- **Digital product delivery** (license keys, downloadable files) — `productType: digital` exists as an enum value on the real `Product` model (Phase A, Catalog contract) but no fulfillment mechanism for it was found; a `digital` product cannot currently actually deliver anything post-purchase.

## Stage 3 — Merchant Gets First Visitor

**Real today**: this is the single strongest stage. A genuinely professional, production-quality Storefront (Milestones 1–2.6): Home/Category/Brand/Collection/Search/Product Detail, real SEO (sitemap, robots, JSON-LD, canonical URLs), Core Web Vitals-conscious build, real Cart (this sprint), a 200-item conversion audit already completed and largely acted on.
**Missing, benchmarked against the category**:
- **A/B testing / experimentation** — no capability exists. `MERCHANT_CONVERSION_AUDIT.md` Part 4 already named this.
- **On-site personalization beyond recommendations** — the recommendation engine exists (trending-fallback only today, per Phase A/E) but no segment-based merchandising exists.
- **Landing page builder / CMS** — explicitly out of scope for every phase so far (`docs/frontend/CMS_ARCHITECTURE.md`/`LANDING_ENGINE_ARCHITECTURE.md` are architecture-only documents, no implementation).
- **Live chat / pre-sale support widget** — no such capability anywhere in the Storefront.

## Stage 4 — Customer Purchases (Cart → Checkout)

**Real today, as of this sprint**: a complete, real Cart Engine (localStorage, cross-tab sync, saved-for-later, real analytics events) and a complete, honestly-bounded Checkout form (address, courier preference, payment method selection, real validation).
**The single largest blocker in this entire audit, restated precisely from Phase A/C**: **checkout cannot submit.** No guest-facing backend authentication guard exists (Category B) — every Checkout/Payments/Shipping/Customers/Orders route requires staff `auth:sanctum`. A merchant cannot take a single real order through this Storefront today. This is not a missing screen; every screen exists. It is a missing backend capability, named with full technical precision in `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8, with a concrete, scoped implementation order already proposed there.
**Also missing, once Category B is resolved**: guest cart → customer account merge (documented as a real, ready contract in `BETA_CART_ENGINE_REPORT.md`, not yet buildable), coupon/gift-card entry on Checkout (backend supports coupon codes; UI deliberately deferred to the exact page that will call it), abandoned-checkout recovery *email* (the real backend already publishes a `CheckoutAbandoned` domain event and has a `RecoverCheckoutSessionAction` — but no notification is wired to actually reach the shopper).

## Stage 5 — Payment

**Real today**: genuinely the platform's best-kept secret, confirmed in Phase D — real, contract-driven gateway implementations for COD, bKash, Nagad, SSLCommerz, and Bank Transfer, against each provider's real documented API. `GatewayFactory`'s own "one match arm, one config block" extensibility already matches every competitor's own plugin-gateway architecture.
**Missing**: Rocket, PortPos (no gateway class exists at all — genuinely absent, not just unreachable). Real merchant credentials for every non-COD gateway (an ops/deployment task, not engineering). Storefront-reachability (same Category-B blocker as Stage 4 — payment cannot be *initiated* by a real shopper any more than checkout can be *submitted*). **A real integration gap independent of Category B**: `SubmitCheckoutAction` creates an `Order` but never calls `InitiatePaymentAction` — even a fully-authenticated internal caller (staff, via `apps/admin`) placing a phone order today would need a second, separate manual step to actually charge the customer. This is a real orchestration gap worth closing regardless of when Category B ships.

## Stage 6 — Shipment

**Real today**: a full Shipping module (`apps/admin`'s own Shipping screens — Zones, Methods, Rates) plus a contract-driven Courier subsystem (Pathao, Steadfast, RedX, Paperfly, Sundarban, eCourier, Manual — Phase D). `CalculateShippingRateAction` and a real `shipping/quote` endpoint exist.
**Missing**: Checkout↔Shipping composition (Phase A finding — Checkout's own flat 3-option `ShippingOptionCatalog` was never updated to call the real Shipping module that was clearly built after it). Pathao's location-hierarchy resolution (named in its own docblock, Phase D). Bulk shipment booking / pick-pack-ship warehouse workflow UI — no evidence found of a packing-slip or pick-list generation screen. Real-time courier webhook status updates (a shipment's status, once booked, updating automatically as the courier moves it) — not found; likely a real gap, flagged for follow-up rather than asserted definitively.

## Stage 7 — Delivery

**Real today**: `OrderTimelineEvent`s exist as a real, append-only history on every Order (confirmed Phase E). COD's own real Payment lifecycle (`pending` → `captured` on delivery confirmation) is genuinely production-shaped.
**Missing**: any shopper-facing delivery tracking (Order Success/tracking page exists as real components per Phase E but has no live data path — same Category-B/Orders-staff-gated blocker). Delivery exception handling (failed delivery, redelivery scheduling, return-to-sender) — no evidence of a dedicated workflow for this found in Orders or Shipping.

## Stage 8 — Review

**Real today**: a complete, honest Review Foundation (`RatingSummary`, `ReviewCard`, `ReviewList`, `ReviewFilters`, `QASection` — Milestone 2.6), already wired live on the Product Detail page with a correct, honest empty state.
**Missing**: the Reviews *backend* itself. No Reviews domain exists anywhere in `apps/backend/app/Domains` — confirmed independently in three separate phases of this engagement now (Milestone 2.6, Phase A, Phase E). This is the single most consistently re-confirmed gap in the entire platform. A shopper can never actually leave a review today, on any product, under any circumstance.

## Stage 9 — Repeat Purchase

**Real today**: `Customer`/`CustomerAddress` models exist with default-billing/default-shipping flags; a guest checkout correctly resolves to a real, reusable `Customer` record by email (Phase A, `SubmitCheckoutAction`'s own resolution logic).
**Missing**: any customer-facing account area at all (order history, saved addresses, saved payment methods, reorder) — entirely blocked on Category B, same root cause as Stage 4. Loyalty/rewards program — no backend module exists (Phase B's own `PromoCodePlaceholder` already named this). Wishlist persistence beyond the browser — `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §2.3 already names this as real, deliberate, Category-A/B-scoped future work, not yet built.

## Stage 10 — Marketing

**Real today**: a real `marketing` admin module exists (registered, `PHASE_3_0` reports found in `planning/reviews/` for "Marketing" Slices 1–2 and a Freeze report) — Promotions/coupons are real and load-bearing inside Checkout's own real pricing composition (Phase A, `ReviewCheckoutAction` calling `EvaluatePromotionsAction`).
**Missing**: email marketing/campaign sending (no evidence of an email-campaign builder or a transactional-email trigger for cart abandonment, order confirmation, or shipping updates — a real, immediate gap given `CheckoutAbandoned`/`OrderPlaced`/domain events already exist and are simply unconsumed by anything that sends mail). SMS marketing (a genuinely BD-market-standard channel per `MERCHANT_CONVERSION_AUDIT.md` Part 3, not found anywhere). Facebook/Instagram/TikTok ad-pixel and catalog-feed integration (CDP event pipeline exists with a stubbed `meta-capi` destination, per Phase E — real infrastructure, no real credential, no live trigger since Checkout can't complete).

## Stage 11 — Reports

**Real today**: none found. No `reports`, `analytics`, or `insights` module exists in `apps/admin`'s own registered module list (`modules/index.ts`, re-confirmed directly this phase) — `INSIGHTS_PLATFORM_ARCHITECTURE.md` and `CDP_ARCHITECTURE.md` exist as architecture-only documents, matching this sprint's own explicit "NOT analytics" exclusion, but worth stating plainly here: **a merchant using this platform today has no dashboard answering "how much did I sell," "what's my best-selling product," or "where are my customers coming from."** `apps/admin`'s own Dashboard module exists but its actual content was not re-verified this phase — flagged for a follow-up check rather than assumed to already answer this.

## Stage 12 — Growth

**Real today**: the platform's own domain-event architecture (every module publishes real domain events — `OrderPlaced`, `CheckoutCompleted`, `PaymentCaptured`, etc., confirmed across Phase A) is a genuinely strong foundation for future automation, exactly as `docs/MASTER_PRODUCT_ROADMAP.md` itself already states ("Automation ... is designed for from Phase 1 ... but is deliberately not built until Commerce and Operations are mature enough to automate something real").
**Missing**: any actual automation/workflow engine consuming those events. Any multi-channel selling (marketplace integration — Daraz, Amazon — explicitly out of this sprint's scope and the platform's own current roadmap). Any B2B/wholesale capability (tiered pricing exists structurally in Pricing per the roadmap's own module list, but B2B-specific flows like quote requests or net-terms invoicing were not found).

---

## Master Gap List — Every Missing Workflow, Screen, Automation, Report, and Enterprise Feature Named Above

**Launch-blocking (nothing sells without these):**
1. Customer-facing authentication guard (Category B) — blocks Stages 4, 5, 7, 9 simultaneously.
2. A write-capable Gateway credential + Guest Cart/Session bridge (the smaller, faster-to-ship precursor named in `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8).
3. Checkout submission → Payment initiation orchestration (real gap, independent of #1).
4. Checkout ↔ Shipping composition (real gap, independent of #1).
5. A Reviews backend domain (re-confirmed missing three separate times across this engagement).

**Should exist before calling this "production-ready" for a real merchant:**
6. Transactional email (order confirmation, shipping update, cart-abandonment recovery) — the domain events already exist; nothing consumes them to send mail.
7. Product bulk import (CSV) — explicitly deferred, not yet built.
8. A Reports/Analytics module — does not exist at all.
9. An onboarding/setup-checklist flow for a new merchant.
10. Delivery exception handling (failed delivery, redelivery, return-to-sender).

**Should exist before this is positioned as enterprise/SaaS-grade:**
11. Real multi-tenancy (currently one hardcoded default tenant platform-wide).
12. A/B testing and on-site personalization beyond basic recommendations.
13. Loyalty/rewards, referral, and gift-card backends (all confirmed non-existent).
14. Google/Meta product-feed export.
15. SMS marketing and a real (credentialed) Meta CAPI integration.
16. `generateStaticParams`, CI-run quality gates, bundle-size budgets (already named in `MERCHANT_CONVERSION_AUDIT.md` Part 4, restated here as still open).

---

## Readiness by Merchant-Journey Stage

| Stage | Readiness |
|---|---|
| 1. Create store | 🟡 Functional, unguided |
| 2. Upload products | 🟢 Strong (bulk import is the one real gap) |
| 3. First visitor | 🟢 Strong — this platform's clear strength |
| 4. Purchase | 🔴 Blocked — cannot submit |
| 5. Payment | 🟡 Real architecture, zero live credentials, one orchestration gap |
| 6. Shipment | 🟡 Real architecture, not composed into Checkout |
| 7. Delivery | 🔴 No shopper-facing tracking path |
| 8. Review | 🔴 UI real, backend does not exist |
| 9. Repeat purchase | 🔴 Blocked — same root cause as Stage 4 |
| 10. Marketing | 🟡 Coupons real; email/SMS/social entirely absent |
| 11. Reports | 🔴 Does not exist |
| 12. Growth | 🟡 Strong event foundation, zero automation built on it |

## Final Verdict, Restated Plainly

Four of twelve stages are genuinely production-grade today (Catalog, Storefront browsing, Payment/Shipping *architecture*, and the event foundation for future Growth work). Five are directly or indirectly blocked by one single, precisely-named backend gap (Category B). Three (Reviews backend, Reports, transactional email) are gaps this sprint's own scope did not include but are large enough that no merchant readiness claim should omit them. This audit's own conclusion matches `LAUNCH_BLOCKER_STATUS.md`'s from the prior sprint, sharpened with two sprints' worth of additional real evidence: **the platform is not yet production-ready for a real merchant**, and the single highest-leverage next investment is unchanged — closing Category B, in the concrete, scoped order `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8 already lays out.
