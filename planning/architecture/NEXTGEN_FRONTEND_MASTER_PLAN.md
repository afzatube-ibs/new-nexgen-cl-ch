# NEXTGEN_FRONTEND_MASTER_PLAN

## The Customer Experience Platform — Master Architecture & Strategy

| Field | Value |
|---|---|
| **Status** | Draft — Proposed, pending Product Owner review. **No code written. No commit. No push**, per the governing instruction for this entire research pass. |
| **Date** | 2026-08-17 |
| **Author** | Chief Software Architect & Lead Engineer |
| **Connects** | `docs/frontend/STORE_FRONTEND_ARCHITECTURE.md`, `docs/frontend/THEME_ENGINE_ARCHITECTURE.md` (extended), `docs/frontend/LANDING_ENGINE_ARCHITECTURE.md`, `docs/frontend/CMS_ARCHITECTURE.md`, `docs/frontend/SEARCH_ARCHITECTURE.md`, `docs/frontend/CUSTOMER_EXPERIENCE_ARCHITECTURE.md`, `planning/architecture/BETA1_FRONTEND_ROADMAP.md` — all produced this same research pass |

---

## 1. Executive Summary

neXgen Core has, today, a completely real, frozen, production-grade **operational backend** — 19 modules, Catalog through Payments through Marketing, each researched, built, tested, and audited to a 95+ readiness bar across this engagement's own prior phases — and a completely real, Accepted **frontend foundation** (`ADR-0005`/`0006`/`0009`, `DESIGN_SYSTEM.md`, `ADMIN_SHELL_ARCHITECTURE.md`, `THEME_ENGINE_ARCHITECTURE.md`, `STOREFRONT_COMPONENT_ENGINE.md`, `CMS_FOUNDATION_ARCHITECTURE.md`, `PERFORMANCE_FOUNDATION.md`) — but **zero customer-facing surface of any kind**. No `apps/storefront` exists. No CMS backend exists. No customer authentication exists anywhere in the backend — every one of the ~150+ real endpoints this platform has built requires a staff bearer token.

This research pass's central finding is that this is not 19 separate gaps — it is **one architectural gap** (a Backend-for-Frontend layer bridging the real, staff-only backend to a public storefront, plus one real, missing backend capability — a customer identity guard) sitting underneath everything else. Once that gap is named precisely (`STORE_FRONTEND_ARCHITECTURE.md` §0/§3), the rest of the Customer Experience Platform — Theme Engine, Landing Engine, CMS, Search, Customer Experience surfaces — resolves into concrete, buildable, correctly-sequenced work, most of it requiring **no backend change at all**.

The seven documents this pass produced (`STORE_FRONTEND_ARCHITECTURE.md`, the extended `THEME_ENGINE_ARCHITECTURE.md`, `LANDING_ENGINE_ARCHITECTURE.md`, `CMS_ARCHITECTURE.md`, `SEARCH_ARCHITECTURE.md`, `CUSTOMER_EXPERIENCE_ARCHITECTURE.md`, `BETA1_FRONTEND_ROADMAP.md`) together answer the mandate in full: design the entire customer-facing platform, correctly, before any Storefront code is written — without copying Shopify/Commerce Layer/Saleor/Medusa/BigCommerce/commercetools, and without becoming "a website builder wearing operational software as a feature" (`VISION:NON_GOALS`), by building every customer-facing capability as a thin, honest presentation layer over the real operational depth this platform already has, never a second, parallel commerce engine.

---

## 2. Architecture at a Glance

```
                    ┌─────────────────────────────────────────┐
                    │         Real Backend (frozen)             │
                    │  Catalog · Pricing · Promotions · Inventory│
                    │  Checkout · Orders · Payments · Customers  │
                    │  Search · (proposed: CMS) · (proposed: guard)
                    │  100% auth:sanctum + staff permission      │
                    └───────────────────┬─────────────────────┘
                                        │ REST (ADR-0007)
                    ┌───────────────────▼─────────────────────┐
                    │   BFF — apps/storefront Route Handlers    │
                    │   (STORE_FRONTEND_ARCHITECTURE.md §3)     │
                    │   Category A: service credential (today)  │
                    │   Category B: customer guard (future)     │
                    └───────────────────┬─────────────────────┘
                                        │
        ┌───────────────────────────────┼────────────────────────────────┐
        │                               │                                │
┌───────▼────────┐          ┌───────────▼───────────┐         ┌──────────▼─────────┐
│ Storefront Engine │        │ Storefront Component  │         │  Search / CMS /     │
│ (Theme resolution, │◄──────┤ Engine (primitives)   │         │  Landing Engine     │
│  Section rendering) │        │ STOREFRONT_COMPONENT_  │         │  (composed FROM      │
│ THEME_ENGINE_       │        │ ENGINE.md              │         │  the same primitives, │
│ ARCHITECTURE.md     │        └────────────────────────┘         │  never a second engine)│
└─────────────────────┘                                          └─────────────────────┘
```

Every box above already has a document. Nothing in this diagram is speculative architecture invented for this master plan — it is the composition of seven already-written documents into one picture.

---

## 3. Dependency Order & Recommended Implementation Order

This is `BETA1_FRONTEND_ROADMAP.md` §2's own milestone sequence, restated here as the master plan's own connecting summary:

1. **M1 — Storefront Foundation** (scaffold, Theme Engine contract, default primitives, BFF Category A) — no backend blocker.
2. **M2 — CMS Backend** (`CMS_ARCHITECTURE.md`) — no backend blocker beyond formal `MODULE:AUTHORITY` addition.
3. **M3 — `nexgen-default` Theme Package** — depends on M1.
4. **M4 — Guest Checkout, live** — depends on M1's BFF pattern only; the real Checkout backend already supports this in full.
5. **M5 — Customer Auth Guard** (backend, out of this phase's authority) — the single remaining hard blocker, unblocks Account/Profile/order history/authenticated checkout.
6. **M6 — Search upgrade** — parallelizable with M2–M5.
7. **M7 — Landing & Funnel Engine flagship features** — depends on M2 and M4.
8. **M8 — Wishlist/Reviews/Account depth** — depends on M5 and their own not-yet-added backend modules.

**The single highest-leverage sequencing decision**: M4 (a real, transacting, guest-checkout storefront) ships *before* M5 (customer identity). This is the opposite of the intuitive-but-wrong order ("build accounts first") and is what makes a real Beta 1 achievable without waiting on the platform's single largest remaining backend gap.

---

## 4. Biggest Risks

1. **The customer-auth-guard gap is underestimated.** It is easy to read `STORE_FRONTEND_ARCHITECTURE.md` §3.3 as "a small addition" because it is described in a few paragraphs — it is not. It is a new identity system, parallel to but distinct from staff Identity & Access, with its own password/session/security review (`08_SECURITY_STANDARD.md` in full) before it can be trusted with real customer credentials. Treating it as a minor task rather than its own architecture-and-implementation phase is this plan's single biggest execution risk.
2. **CMS backend scope creep.** `CMS_ARCHITECTURE.md` deliberately scoped itself tightly (JSON content tree, no normalization, approval workflow optional) specifically to avoid this — the risk is a future implementer "improving" it into a fully normalized, over-engineered content platform before Beta 1 ships anything real. The JSON-tree recommendation exists precisely to keep this module small enough to actually finish.
3. **Landing Engine built before Checkout is live.** `LANDING_ENGINE_ARCHITECTURE.md`'s entire competitive thesis (§1–§2) depends on order bumps/upsells/Instant Checkout being genuinely *inside* real Checkout, not a preview of it — if M7 work starts before M4 (real guest checkout) is live, there is a real risk of someone building a "good enough for now" mock checkout path to unblock Landing Engine work, which would silently recreate exactly the "two systems, one drifts from the other" failure mode this entire document set was designed to avoid.
4. **Theme Engine's contract (`ThemePackage`) gets broken informally.** It is Experimental-equivalent (no theme has ever implemented it yet, per `MODULE:STABILITY`'s own logic) — the risk is the *first* real theme (M3) discovering the contract is wrong in some way and getting patched ad hoc rather than through the same `GOVERNANCE:CHANGE_MANAGEMENT` discipline every other Accepted document in this project already follows.
5. **Zero performance budget exists.** `PERFORMANCE_FOUNDATION.md` correctly declined to set numeric targets against zero implementation — but that means Beta 1 could ship materially slow (defeating the entire competitive point of a fast, SEO-real storefront) without anyone having committed to a number to be held against. A budget should be set the moment M1 has a first real build, not deferred indefinitely.

---

## 5. Biggest Opportunities

1. **A genuinely un-droppable price/stock consistency guarantee.** Because the Landing Engine, Storefront, and Checkout all share one BFF and one real backend (§2's diagram), neXgen can make a claim no incumbent named in `LANDING_ENGINE_ARCHITECTURE.md` §2 can make honestly: what a page shows is *always* what checkout will charge, because there is only ever one system computing it. This is marketable, not just architecturally clean.
2. **Server-side-first tracking, in a cookie-deprecated world.** `LANDING_ENGINE_ARCHITECTURE.md` §3.5's server-side CAPI-equivalent event design is materially more accurate than every named incumbent's default client-pixel approach, at a moment (2026) where that accuracy gap is only widening industry-wide.
3. **A real funnel dashboard for free.** `CheckoutStarted`/`CheckoutAbandoned`/`CheckoutCompleted` already exist as real, published domain events, unused by any UI. A Conversion Dashboard (`LANDING_ENGINE_ARCHITECTURE.md` §3.6) requires zero new backend instrumentation — this is a near-zero-marginal-cost differentiator sitting in the codebase today.
4. **Gift Cards is not speculative.** `Models\Promotion`'s own docblock already designed room for it. This is a genuine, low-risk future capability, not a "someday, maybe" — worth naming explicitly to the Product Owner as closer than it looks.
5. **The pluggable engine patterns (Payments, Search) are a real platform asset.** `SEARCH_ARCHITECTURE.md` §2 gets to propose "swap in a real search engine" as a same-shape change to an already-proven extensibility pattern, not a new architectural risk — this consistency (Payments' `GatewayFactory`/`GatewayRegistry`/`GatewayResolver` and Search's identically-shaped `SearchEngineFactory`/`Registry`/`Resolver`) is itself evidence the platform's own architectural discipline compounds in value the longer it's followed.

---

## 6. Future Strategy

### 6.1 SaaS Strategy (frontend-specific)
Every document in this set already inherits `ARCH_PLAN:RESOLVED_DECISIONS` item 1's "extension, not redesign" requirement without exception: `STORE_FRONTEND_ARCHITECTURE.md` §6 threads a store identifier through every BFF call today, as a no-op; `THEME_ENGINE_ARCHITECTURE.md` §3 already resolves theme per-store, not globally. The frontend's own SaaS transition, when `IMPLEMENTATION_MASTER_PLAN.md` Phase 4's "SaaS Readiness" activates, is therefore primarily a *backend* tenant-boundary activation (already designed for, per `05_DATA_ARCHITECTURE.md`'s `DATA:OWNERSHIP`) that the frontend layer absorbs by exercising parameters it already carries, not a frontend rewrite.

### 6.2 Future Theme Marketplace
Fully addressed in `THEME_ENGINE_ARCHITECTURE.md` §10 — the sandboxing (§4) and inheritance (§9) mechanisms already exist specifically to make this possible without redesign once distribution/certification/licensing (genuinely separate, non-architectural concerns) are solved.

### 6.3 Future Plugin Marketplace
The Storefront's own Extension System dependency is identical in shape to the backend's already-designed `MODULE:EXTENSIBILITY_MECHANISM` (`04_MODULE_ARCHITECTURE.md` §12) — a storefront-side "plugin" is architecturally a Theme Package with a narrower surface (event-subscription only, no rendering component), or a Section type contributed via the same registration pattern. No new mechanism is required; this is a naming and scoping exercise for a future phase, not a new architecture.

### 6.4 Future AI Roadmap
Consolidated from every document's own named-not-built AI extension point: semantic/AI Search (`SEARCH_ARCHITECTURE.md` §3.6), AI-assisted Landing Engine optimization (`LANDING_ENGINE_ARCHITECTURE.md` §5), AI-assisted CMS content generation (`CMS_ARCHITECTURE.md` §5's future visual editor is the natural host surface). All three attach through the Extension System, per `VISION:NON_GOALS`'s "additive, never load-bearing" rule — consistently, not module-by-module improvised.

### 6.5 Future Mobile Roadmap
Not named in any document this pass produced, stated here explicitly: the BFF (`STORE_FRONTEND_ARCHITECTURE.md` §3) is, by construction, a real API surface independent of the Next.js rendering layer consuming it — a future native mobile app is a second consumer of the same BFF contract, not a reason to touch the backend again. This is a direct, free consequence of the BFF pattern this plan commits to for entirely different reasons (§0's auth gap), worth naming to the Product Owner as an option this architecture already buys.

### 6.6 Future Enterprise Roadmap
Multi-store (`STORE_FRONTEND_ARCHITECTURE.md` §6), multi-domain, and the Theme/Plugin marketplace (§§6.2–6.3) together are what "enterprise" concretely means for the frontend layer — no separate enterprise-tier architecture is proposed, consistent with `VISION:AUDIENCE`'s own priority order (independent merchants first, enterprise "not day-one").

---

## 7. What Would Make neXgen Better Than Shopify — Frontend-Specific

1. **No price/stock drift, ever**, by construction (§5.1) — a structural guarantee, not a QA promise.
2. **Server-side-first tracking** resilient to the exact privacy shifts that are steadily degrading every competitor's own attribution accuracy (§5.2).
3. **A real, zero-marginal-cost conversion funnel** built on events the backend already emits (§5.3) — most platforms bill separately for analytics depth this platform gets for free from its own event-sourcing discipline.
4. **A genuinely swappable, sandboxed theme engine** (`THEME_ENGINE_ARCHITECTURE.md` §4/§9/§10) designed for a marketplace from day one, not retrofitted after a monolithic theme system already shipped — the same mistake Shopify's own Liquid-era theme architecture took years to unwind.
5. **One design language, two frontends, one token source** (`ADR-0009`, `DESIGN_SYSTEM.md`) — admin and storefront staying visually and behaviorally coherent is a real competitive-feel advantage most platforms (admin and storefront built by different teams, years apart) never achieve.

---

## 8. Tradeoffs Made Explicit

- **JSON-tree CMS storage over full normalization** (`CMS_ARCHITECTURE.md` §3.1) — trades per-Section server-side query capability (never actually needed) for real implementation simplicity now.
- **Guest checkout before customer accounts** (§3 above) — trades "accounts first" intuition for a materially faster path to a real, transacting Beta 1.
- **No numeric performance budget yet** (`PERFORMANCE_FOUNDATION.md`, reaffirmed here) — trades a premature, unfounded target for an honest one to be set against a real M1 build, at the cost of nothing currently holding Beta 1 accountable for speed.
- **A single shared BFF over per-feature edge functions** — trades some deployment granularity for one coherent place every Category A/B distinction (`STORE_FRONTEND_ARCHITECTURE.md` §3) is enforced, avoiding a scattered, harder-to-audit security boundary.

---

End of Document
