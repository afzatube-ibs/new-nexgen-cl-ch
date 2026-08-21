# NEXTGEN_PLATFORM_MASTER_ROADMAP

## The Full Customer Experience Platform — CDP, Gateway, Marketplace, Insights

| Field | Value |
|---|---|
| **Status** | Draft — Proposed, pending Product Owner review. No code written, no commit, no push. |
| **Date** | 2026-08-17 |
| **Supersedes-in-scope** | Extends `NEXTGEN_FRONTEND_MASTER_PLAN.md` and `BETA1_FRONTEND_ROADMAP.md` (both unmodified, still valid for the Storefront/Theme/Landing/CMS/Search/Customer-Experience layer) with the four Phase 3.3 layers: `CDP_ARCHITECTURE.md`, `STORE_API_GATEWAY_ARCHITECTURE.md`, `MARKETPLACE_PLATFORM_ARCHITECTURE.md`, `INSIGHTS_PLATFORM_ARCHITECTURE.md` |

---

## 1. Architecture Layers

```
Real Backend (frozen, 19 modules, 100% staff-gated)
  ↓
Store API Gateway (STORE_API_GATEWAY_ARCHITECTURE.md) — the mandatory chokepoint;
  everything below this line calls the backend ONLY through here
  ↓                                    ↓
Storefront Engine / Theme Engine /     Customer Data Platform
CMS / Search / Landing Engine          (CDP_ARCHITECTURE.md) —
(prior phase's five documents)         ingests through the Gateway,
  ↓                                    feeds Insights and Landing Engine
Marketplace Platform                   ↓
(MARKETPLACE_PLATFORM_ARCHITECTURE.md  Insights & Intelligence Platform
 — Theme + Plugin, extends the         (INSIGHTS_PLATFORM_ARCHITECTURE.md)
 Theme Engine contract and the         — consumes CDP + real DomainEvents,
 backend's real Extension mechanism)   is MODULE:REPORTING's own architecture
```

Every layer above is a **consumer** of the real backend and of each other through already-named contracts — nowhere in this stack is there a second, parallel source of commerce truth. This is the single property every document in both this phase and the prior one was independently designed to preserve, and it holds across the whole stack, not just within one document.

---

## 2. Dependencies (What Blocks What)

- **Store API Gateway** blocks nothing upstream (no backend change required for its Category A path) and is itself the prerequisite for **everything** else in this document — CDP's browser/hybrid event ingestion, every Storefront page, Insights' own data ultimately flowing through it.
- **CDP** depends on the Gateway existing (§ above) for ingestion; its Customer-Identity tier and cross-device resolution depend on the same customer-auth-guard backend gap `STORE_FRONTEND_ARCHITECTURE.md` §3.3 already named — everything else in CDP (Anonymous/Guest identity, all six domains of event capture, Destinations) does not.
- **Insights** depends on CDP for Marketing Intelligence and behavioral Customer Intelligence specifically; Sales/Inventory/Operations/Financial Intelligence depend only on the real, already-existing `DomainEventBus` and can be built without CDP existing at all.
- **Theme Marketplace** depends on M3 (a first real theme, `BETA1_FRONTEND_ROADMAP.md`) existing to prove the `ThemePackage` contract in real use before publishing it externally.
- **App Marketplace** depends on the backend's own `MODULE:EXTENSIBILITY_MECHANISM` (already Accepted, not yet built — `04_MODULE_ARCHITECTURE.md` §12) and the Webhooks & Integrations module (`IMPLEMENTATION_MASTER_PLAN.md` §34, Phase 2, not yet built) — both real, named, but genuinely unbuilt backend prerequisites, making App Marketplace the single most backend-blocked layer in this entire document.

---

## 3. Implementation Order — Extending `BETA1_FRONTEND_ROADMAP.md`'s M1–M8

| Milestone | Content | New in this phase? |
|---|---|---|
| **M1** | Storefront Foundation — now including the **full** Gateway scope (auth pipeline, rate limiting, circuit breakers, caching, preview/draft mode) per `STORE_API_GATEWAY_ARCHITECTURE.md` §1, not only the Category-A proxy `BETA1_FRONTEND_ROADMAP.md` originally scoped | Expanded |
| **M1.5** | **CDP Foundation** — identity ladder, Event Engine, at least the Warehouse destination and one real advertising destination live | **New** |
| M2 | CMS Backend | Unchanged |
| M3 | `nexgen-default` Theme Package | Unchanged |
| M4 | Guest Checkout, live — CDP's server-side `checkout_completed` tracking activates naturally the moment this ships | Unchanged, now CDP-enriched |
| M5 | Customer Auth Guard (backend) — also unblocks CDP's Customer Identity tier | Unchanged |
| M6 | Search upgrade | Unchanged |
| M7 | Landing & Funnel Engine flagship features — now explicitly also dependent on **M1.5**, since split-testing, server-side tracking, and the Conversion Dashboard (`LANDING_ENGINE_ARCHITECTURE.md` §§3.4–3.6) all require CDP to exist, not just CMS+Checkout | Dependency added |
| M8 | Wishlist/Reviews/Account depth | Unchanged |
| **M9** | **Insights & Intelligence Platform** — depends on M1.5; most valuable once M4 provides real transaction volume | **New** |
| **M10** | **Marketplace Platform** — Theme Marketplace depends on M3; App Marketplace additionally depends on the backend's own Extension System and Webhooks & Integrations modules, neither built yet | **New, correctly sequenced last** |

---

## 4. Critical Risks

### 4.1 Security
- The customer-auth-guard gap (M5) remains the platform's single largest unaddressed security surface — CDP's own Customer Identity and cross-device resolution, and every Account-area capability, are all blocked behind it, compounding its priority beyond what `STORE_FRONTEND_ARCHITECTURE.md` alone already stated.
- **Natural-language-query-to-raw-SQL** is a named, designed-against risk (`INSIGHTS_PLATFORM_ARCHITECTURE.md` §4.1) — the single most important security constraint in the Insights layer, worth restating here because it is the kind of risk that is easy to reintroduce carelessly in a future implementation phase if this document's own scoping rule isn't carried forward deliberately.
- Marketplace plugin permissions (`MARKETPLACE_PLATFORM_ARCHITECTURE.md` §8) are only as good as certification review actually catching a mismatch between declared and actual behavior — a real, ongoing operational risk, not a one-time design risk.

### 4.2 Performance
- CDP event volume at real merchant scale (§`CDP_ARCHITECTURE.md` §4.4) requires the queue-based decoupling design to actually hold under load — an implementation phase must verify this with real load testing (`TESTING:PERFORMANCE_TESTING`'s already-Accepted evidence-based standard), not assume it from the architecture alone.
- The Gateway's circuit-breaker design (`STORE_API_GATEWAY_ARCHITECTURE.md` §3.2) is only as good as its thresholds being tuned against real traffic — untuned thresholds risk either false-tripping (degrading a healthy backend unnecessarily) or never tripping (failing to protect against a real incident).

### 4.3 Scalability
- The real `DomainEventBus` is explicitly in-process today (`ADR-0001`'s own stated, accepted limitation, with a named revisit trigger) — CDP and Insights both consume it at increasing volume as this stack matures; a genuine multi-tenant SaaS scale (`IMPLEMENTATION_MASTER_PLAN.md` Phase 4) is the point at which this in-process assumption should be revisited, per `ADR-0001`'s own already-stated criterion, not before.

---

## 5. Beta / RC / v1.0 / v2.0 Scope

- **Beta** — M1–M4 (real, transacting, guest-checkout-only storefront), matching `BETA1_FRONTEND_ROADMAP.md` exactly.
- **RC (Release Candidate)** — Beta + M5 (customer accounts) + M6 (search upgrade) + M1.5 (CDP foundation, real tracking/attribution live) — feature-complete for a genuine launch.
- **v1.0** — RC + M7 (Landing/Funnel flagship, now CDP-powered) + M9 (Insights) — the first genuinely differentiated, sellable release.
- **v2.0** — v1.0 + M8 (Wishlist/Reviews) + M10 (Marketplace) + the international-expansion and AI work named in §§6–7 below.

---

## 6. Enterprise Roadmap

Multi-store/multi-domain (`STORE_FRONTEND_ARCHITECTURE.md` §6, already designed-for) + SaaS tenant-boundary activation (`NEXTGEN_FRONTEND_MASTER_PLAN.md` §6.1, already designed-for) + Marketplace governance at real third-party-developer scale (`MARKETPLACE_PLATFORM_ARCHITECTURE.md` §18) — no new architecture proposed here; this section only confirms the three pieces already designed across this and the prior research phase are what "enterprise" concretely means for this platform, consistent with `VISION:AUDIENCE`'s own stated priority order.

## 7. AI Roadmap (Consolidated)

Every AI-extension-point named across both research phases, in one place for the first time: semantic/AI Search (`SEARCH_ARCHITECTURE.md` §3.6), Landing Engine optimization (`LANDING_ENGINE_ARCHITECTURE.md` §5), AI-assisted CMS content generation (`CMS_ARCHITECTURE.md` §5), CDP predictive/anomaly detection (`CDP_ARCHITECTURE.md` §8), Insights forecasting and Merchant Copilot/LLM (`INSIGHTS_PLATFORM_ARCHITECTURE.md` §§3–5). Every one of these attaches through the same Extension System, per `VISION:NON_GOALS`'s "additive, never load-bearing" rule, without exception — this consistency is itself worth stating as a deliberate platform property, not a coincidence.

## 8. Marketplace Roadmap

Theme Marketplace launch (M10, depends only on M3) precedes App Marketplace launch (same M10, but additionally gated on two unbuilt backend modules, §2) — a real, stated internal sequencing within M10 itself, not a single atomic milestone. Future billing (`MARKETPLACE_PLATFORM_ARCHITECTURE.md` §§7/13) and third-party developer ecosystem growth (Developer Portal, §14) follow only once both marketplaces have real, proven listings.

## 9. International Expansion Roadmap

Localization & Currency (already real, Phase 1 basic per the master plan) → multi-currency settlement depth (Phase 2 per the same plan) → regional consent variants (`CDP_ARCHITECTURE.md` §3.3's GDPR/CCPA/LGPD design, already built to extend to further regimes without a new mechanism) → region-specific payment gateways, following the exact proven precedent Payments' own Bangladesh-first, contract-based gateway architecture already established (a new region's gateway is "implement `PaymentGatewayContract`, register it," an already-proven acceptance criterion, not new architecture).

---

End of Document
