# neXgen Core
## MASTER_PRODUCT_ROADMAP

| Field | Value |
|---|---|
| **Title** | Master Product Roadmap |
| **Document ID** | ROADMAP |
| **Version** | 1.0 |
| **Status** | Accepted |
| **Author** | Chief Software Architect & Lead Engineer, drafted at Product Owner's direction, written jointly from the Product & Solution Architect, Enterprise Ecommerce Consultant, and SaaS Product Strategist perspectives the Product Owner's brief specifically requested |
| **Approved By** | Product Owner (2026-08-10) |
| **Category** | Process & Roadmap Document — not a Foundation Document (`00`–`11`). Sits alongside `docs/RELEASE_MANAGEMENT.md`, in the same relationship to the closed `00`–`11` set that document already established for itself |
| **Last Updated** | 2026-08-10 |
| **Parent Document** | `docs/00_PROJECT_GOVERNANCE.md`, `docs/01_PRODUCT_VISION.md`, `docs/02_PRODUCT_PRINCIPLES.md` |
| **Related Documents** | `docs/03_SYSTEM_ARCHITECTURE.md`, `docs/04_MODULE_ARCHITECTURE.md`, `docs/RELEASE_MANAGEMENT.md`, `docs/decisions/2026-08-09-catalog-headless-first-principle.md`, `planning/IMPLEMENTATION_MASTER_PLAN.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`, ADR-0001 through ADR-0009 |
| **Applies To** | Every phase, module, launch decision, and release from Phase 2.3 onward — this document is the execution plan every future phase must follow |

Unlike `00`–`02`, this document names real, concrete phases, dates, and deployment targets (`store.weshopbd.com`, `Lokkisona`) where doing so is the entire point of a roadmap — it is deliberately more concrete than a constitutional document, in the same spirit `docs/RELEASE_MANAGEMENT.md` already established for itself. Where it states a principle, it defers to the document that principle actually originates from rather than restating it as new authority.

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-08-10 | Initial version. Created after Phase 2.2 (Commerce Foundation — Catalog Engine, Slices 1–2) reached completion, before Phase 2.3 (Inventory Engine) begins, per explicit Product Owner direction to freeze the long-term product direction before continuing implementation. | Explicit Product Owner governance request, 2026-08-10, following the same pattern `docs/RELEASE_MANAGEMENT.md` was created under on 2026-08-09 |

---

# 1. Vision

**Identifier: ROADMAP:VISION**

## 1.1 What neXgen ultimately becomes

neXgen is a **Commerce Operating System** — the single coherent system a growing commerce business runs its entire operation on, for as long as that business exists. This is not new language invented for this document; it is `docs/01_PRODUCT_VISION.md`'s own `VISION:MISSION` made concrete for a 10–20 year horizon: *"Give growing commerce businesses one coherent operating system for their entire commerce lifecycle, so they can run their business instead of maintaining their tools."*

Over a decade, that means neXgen becomes the layer a business's entire operational reality runs through — selling, fulfilling, pricing, serving customers, managing suppliers, understanding its own performance, and eventually automating the parts of the work that don't need a human decision every time. Every one of those capabilities is added as a module inside one coherent system (`ARCH:ARCHITECTURAL_STYLE`, `ARCH:DOMAIN_MAP`), never as a separate disconnected tool the business has to stitch back together — which is precisely the failure mode `VISION:PROBLEM` names as the reason neXgen exists at all.

## 1.2 What neXgen deliberately is not

The Product Owner's own framing for this document is exact and is restated here because it is load-bearing, not decorative:

- **Not an ecommerce CMS.** A content-management surface for a storefront is one capability neXgen has (the content model already specified in `docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`, not yet a formally-named module in `04_MODULE_ARCHITECTURE.md`), never the platform's center of gravity. `VISION:NON_GOALS` already forbids neXgen "becoming a website builder wearing operational software as a feature."
- **Not an ERP.** neXgen absorbs ERP-*adjacent* capability (supplier management, multi-warehouse inventory, multi-company operation) as the business genuinely needs it, as modular, optional extensions to its commerce core — it never becomes a generic ERP replacement whose commerce capability is secondary to general-ledger accounting, HR, or manufacturing resource planning. See §12.
- **Not a marketplace.** neXgen is not primarily a plugin/theme marketplace (`VISION:NON_GOALS`: "will not become primarily a plugin marketplace... Core operational capability belongs in the core") and is not, by default, a multi-vendor selling surface. Both marketplace *capabilities* exist on the long-term roadmap (§6, §12) as optional, additive tiers a business can grow into — never as what a merchant is required to become to use the platform at all.

## 1.3 The final vision, stated plainly

**A business adopts neXgen once and never has to leave it as it grows** — from a single self-hosted store, to a multi-warehouse operation with suppliers and staff, to a multi-brand or multi-company group, to (for the businesses that choose it) a marketplace operator or a licensor of the platform itself to others. Every stage is the same system, deepened — never a migration to a different product. This is `VISION:PLATFORM_PROMISES`'s "the platform evolves without forcing lock-in" and `PRINCIPLES:PREDICTABLE_UPGRADES` extended to their logical endpoint across the platform's entire lifetime, not just across a single release.

---

# 2. Mission

**Identifier: ROADMAP:MISSION**

## 2.1 Who we build for

Priority order is fixed by `VISION:AUDIENCE` and is restated here because every phase-sequencing decision in §6 depends on it:

1. **Independent merchants** escaping a patchwork of disconnected tools.
2. **Growing commerce businesses** whose operational complexity has outgrown a single storefront tool.
3. **Multi-store and multi-brand operators.**
4. **Enterprise organizations** — not a day-one target.
5. **SaaS and agency customers** — a future extension of the operating model, not its starting point.

A roadmap decision that optimizes for tier 4 or 5 at the expense of tier 1 or 2 is, by this ordering, a wrong decision, regardless of how attractive it looks in isolation. This is `VISION:DECISION_FILTER` question 1 ("which merchant problem does this solve?") applied specifically to sequencing, not just to feature design.

## 2.2 What problems we solve

`VISION:PROBLEM` names five, and every phase in §6 exists to close one or more of them: fragmented business logic, duplicated and conflicting data, fragile upgrades, operational dependency on developers, and platforms optimized for looking like a storefront rather than helping a business run itself. A phase that does not visibly reduce at least one of these for the merchant has not justified its place on this roadmap.

## 2.3 Merchant-first philosophy

`PRINCIPLES:MERCHANT_FIRST` is the operating rule for every trade-off this roadmap makes: when a phase-sequencing or scope decision benefits engineering convenience, roadmap velocity, or architectural elegance at the direct expense of a merchant's ability to run their business, the merchant's need wins, and the trade-off is documented, not hidden. Phase 2.2's own Slice 1 → Slice 2 split (ship real taxonomy and general product management first, defer variants/media/organization rather than rush all of it half-built) is the concrete precedent this roadmap continues: a smaller, fully-working capability beats a larger, half-working one, per `PRINCIPLES:OPERATIONAL_CLARITY`.

---

# 3. Product Principles

**Identifier: ROADMAP:PRINCIPLES**

`docs/02_PRODUCT_PRINCIPLES.md` is Accepted, closed, and this document does not amend it, per `GOVERNANCE:CHANGE_MANAGEMENT` — a change to that document requires its own review cycle, not a restatement inside a different one. What follows is split into two honest categories: principles that already exist there under a different name, and execution-level principles this roadmap adds for how phases and releases specifically get sequenced and shipped. The second category is scoped narrowly, the same way `PRINCIPLES:PURPOSE`'s own Cross-Cutting Quality test is scoped — it does not expand product direction, it governs how this document itself is used.

## 3.1 Already-accepted principles, restated under the Product Owner's requested names

| Requested name | Already-accepted identifier | What it means here |
|---|---|---|
| Merchant First | `PRINCIPLES:MERCHANT_FIRST` | A phase or feature that trades merchant clarity for engineering convenience loses, per §2.3. |
| Security First | `PRINCIPLES:SECURITY_FIRST` | No phase reaches "Accepted" (§5, §13) with a known, unaddressed security gap — not deferred, not "unlikely to be hit." |
| Upgrade Safe / Backward Compatible | `PRINCIPLES:PREDICTABLE_UPGRADES` | Every phase after Phase 1 must state, in its own completion report, what happens to a merchant relying on the behavior it changes. This is the principle `RELEASE:SEMVER_POLICY`'s MAJOR/MINOR/PATCH discipline (§10) exists to enforce mechanically. |
| Open Architecture | `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION` + `MODULE:EXTENSIBILITY_MECHANISM` | Capability is added through configuration and the event-subscription extension surface already designed in `04_MODULE_ARCHITECTURE.md` §12 — never by forking or patching a core module. |

## 3.2 This roadmap's own execution principles

These do not appear in `02_PRODUCT_PRINCIPLES.md`. They are scoped to *how a phase is planned and shipped*, not to what the product does for a merchant — the same boundary `GOVERNANCE:TECHNOLOGY_LEAKAGE` draws between constitutional and operational documents.

- **Production First.** A phase is not "done" when it demonstrates a capability against mocked data (`docs/10_TESTING_STANDARD.md`'s own layered test pyramid already requires this, but it bears restating at the roadmap level: see the live-backend verification passes already performed after Phase 2.1 and again during Phase 2.2 Slice 2, both of which found real bugs a mocked-only suite could not). Every phase's Definition of Done (§13) includes at least one pass against a real, running instance of the backend it depends on before that phase is reported complete.
- **Performance First.** A phase that adds a new list, search, or dashboard surface states its expected data volume and verifies against it, not against an empty development database. This operationalizes `ARCH:NFR`'s "Horizontally Scalable"/"Observable" qualities at the phase-planning level rather than leaving them as an abstract system property no phase ever actually checks.
- **API First.** Every capability is built as a real backend contract before any UI consumes it (`docs/06_API_STANDARD.md`), and that UI is never the only consumer that contract is designed for. This is `MODULE:PUBLIC_CONTRACT` and the Catalog headless-first decision (`docs/decisions/2026-08-09-catalog-headless-first-principle.md`) generalized as the standing rule for every Commerce-domain module built after Catalog, exactly as that decision's own "Scope" field already states.
- **Headless Ready.** The Admin UI, the Storefront, a future mobile app, a future POS, a future marketplace surface, and a future AI agent are all equally valid consumers of the same backend contract. No business rule is ever implemented twice for two different consumers — restated at the roadmap level from the same headless-first decision.
- **AI Ready.** Every module publishes the domain events (`ARCH:CROSS_DOMAIN_COMMUNICATION`) a future AI/automation capability would need to observe, and exposes the data it needs to reason over through the same public API contract every other consumer uses — never a bespoke, AI-only backdoor. See §12.4.
- **Extension Friendly.** Every module is built assuming a future extension (`MODULE:EXTENSIBILITY`) will want to observe its events and extend its configuration — this shapes what a module publishes from the start, even before the Extension System itself (Phase 2, per `planning/IMPLEMENTATION_MASTER_PLAN.md` module 6) is built.

A proposed addition to either list must pass the same test `PRINCIPLES:PURPOSE` already applies to Cross-Cutting Quality principles: it must not expand product scope, must introduce no new technology decision, and must represent a baseline expectation of how *this specific platform* — not platforms in general — is planned and shipped.

---

# 4. Product Philosophy

**Identifier: ROADMAP:PHILOSOPHY**

Each area below states the standing philosophy that governs every future phase touching it — grounded in what has already been decided, not invented fresh here.

## 4.1 Admin

The Admin UI is **one consumer** of every backend module, never a module's owner (`docs/decisions/2026-08-09-catalog-headless-first-principle.md`). It is built once, as a permanent shell (`docs/frontend/ADMIN_SHELL_ARCHITECTURE.md`, delivered Phase 2.1) that every future module registers into through the Module Registration Framework, never redesigned per module. Every future Commerce, Operations, or Growth module's admin screens are new registrations into that shell, not new shells.

## 4.2 Storefront

Not yet built. When it is (§6), it follows `ADR-0006` (Next.js, per-route SSG/ISR/SSR) and consumes the same public API contracts the Admin UI already consumes — proving, in practice, that the headless-first decision actually holds, not just that it was written down. `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md` and `docs/frontend/THEME_ENGINE_ARCHITECTURE.md` already specify its primitive inventory and theme layering; that architecture is not renegotiated when Storefront implementation begins, only executed.

## 4.3 Commerce

Commerce-domain modules (`MODULE:COMMERCE`) are built in the dependency order `04_MODULE_ARCHITECTURE.md` §5 already fixes — Catalog before Inventory and Pricing, Pricing and Promotions before Orders, Orders before Checkout — because that order is not a scheduling convenience, it is the actual data-dependency graph. §6 follows this order exactly.

## 4.4 Automation

Automation (`MODULE:AUTOMATION`, Growth domain) is designed for from Phase 1 (every module publishes real domain events already) but is deliberately not built until Commerce and Operations are mature enough to automate something real. Automation consumes events; it is never depended upon by anything it automates (`MODULE:COUPLING_RULES`) — an automation failure must never be able to break the commerce operation it was trying to help.

## 4.5 Analytics

"Reports" and "Tracking & Analytics" (§6, §9's version table) are two related but distinct capabilities: **Reporting** (`MODULE:REPORTING`, Growth) is the platform's own operational reporting, built from the audit-log and event architecture every module already produces; **Tracking** is customer-behavior and storefront-performance analytics, which only becomes meaningful once a real Storefront exists to generate that behavior. Reporting can begin once enough Commerce modules exist to report on; Tracking cannot meaningfully begin before Storefront.

## 4.6 AI

No AI capability exists in this codebase today, and none is added speculatively. Every phase through at least Milestone C (§8) treats AI as a **reserved, not-yet-implemented surface** — exactly the pattern already established in Phase 2.2A/Slice 2's Product Editor (`AiReserveButton`, five reserved-but-disabled locations, "no AI implemented, per the brief"). AI capability is added only once there is real operational data and real events for it to reason over — building it earlier would mean building it against synthetic or absent data, which produces a feature that has to be rebuilt once real data exists anyway.

## 4.7 Marketplace

Two distinct capabilities share this name, and this roadmap keeps them explicitly separate, per §1.2:

- **Extension/Theme distribution** — the Update Engine's own eventual marketplace surface (`RELEASE:UPDATE_ENGINE_PREPARATION`, targeted `v3.0.0`). A distribution channel, never the product's core value proposition, per `VISION:NON_GOALS`.
- **Multi-vendor commerce** — a business model where a merchant's own installation hosts other sellers. A distant, optional capability tier (§12), never a default a single merchant is pushed toward.

## 4.8 ERP

neXgen absorbs ERP-adjacent operational depth (multi-warehouse, suppliers, multi-company) as it becomes real merchant need, always as modules inside the same Commerce Operating System (§1), never as a pivot toward general-purpose ERP (accounting, HR, manufacturing) that would dilute the platform's commerce focus. `planning/IMPLEMENTATION_MASTER_PLAN.md`'s own Phase 4 framing — "ERP-adjacent readiness" — is the standing rule, not a stepping stone toward becoming an ERP vendor.

---

# 5. Development Workflow

**Identifier: ROADMAP:WORKFLOW**

`GOVERNANCE:DELIVERY_LIFECYCLE` already fixes the permanent lifecycle every feature follows: Draft → Engineering Review → Product Approval → Accepted → Implementation → Verification → Release. This roadmap does not replace that lifecycle; it states the concrete steps every phase's *Implementation → Verification* stage has, in practice, always included since Phase 2.1 — and binds every future phase to the same steps, with no phase permitted to skip one:

1. **Architecture** — read every relevant accepted document and real existing source (backend contracts, prior modules) before writing new code; no invented API contracts, no assumed backend behavior (the standing discipline this project has followed since Phase 2.2's own Catalog research, restated permanently here).
2. **Implementation** — build strictly within the module/domain boundary the phase targets, reusing existing shared infrastructure (`MODULE:PUBLIC_CONTRACT`, the Admin Engine's shared framework) rather than duplicating it.
3. **Quality Gates** — typecheck, lint, unit tests, and a production build clean, for every workspace/package touched. This is the objective, repeatable, evidence-based bar `docs/10_TESTING_STANDARD.md`'s own `TESTING:QUALITY_GATES` already requires.
4. **UX Review** — accessibility (`@axe-core`, zero critical/serious violations), responsive verification at real breakpoints, and a self-review for duplication and future extension problems, matching the review depth every phase since 2.1 has actually performed.
5. **Documentation** — `CHANGELOG.md` and `PROJECT_STATUS.md` updated in the same change that completes the phase, never after (`RELEASE:DOCUMENTATION`'s rule, extended from releases to phases).
6. **Commit** — a single, clearly-scoped commit (or a small number of them) describing what shipped, bugs found and fixed, and what was deliberately not built.
7. **Push** — to `origin/main`, verified (`HEAD == origin/main`, clean working tree, no secrets), matching this project's own established verification checklist for every phase to date.
8. **Completion Report** — the same structure this project has used for every phase: architecture summary, what was built, bugs found/fixed, quality gate results, what remains, commit SHA, and the HEAD/clean-tree/no-secrets verification.
9. **Product Owner Approval** — no phase begins the next phase's implementation without it, per `GOVERNANCE:COMPLETION_RULE`. This document exists specifically because the Product Owner exercised this gate before authorizing Phase 2.3.

No phase skips a step. A phase that discovers a step doesn't apply (e.g., no UI was touched, so no responsive check is meaningful) states that explicitly in its own completion report rather than silently omitting it.

---

# 6. Phase Roadmap

**Identifier: ROADMAP:PHASE_ROADMAP**

## 6.1 Completed

| Phase | Delivered | What it proved |
|---|---|---|
| **Phase 1 / 1.1** | All 19 backend modules across Platform, Commerce, Operations, and Growth-adjacent scope, plus a full production-hardening pass. `v1.0.0-phase1` tagged. | The backend can run a real, single-store, self-hosted commerce operation end to end — `VISION:SUCCESS_DEFINITION`'s baseline. |
| **Phase 2.0** | Frontend architecture and design specification (`docs/frontend/*`, `ADR-0005`/`0006`/`0009`) — documents only, no code. | The frontend could be built consistently, once, rather than improvised per module. |
| **Phase 2.1** | The Admin Engine Foundation — permanent Admin Shell, design system, auth, Module Registration Framework, shared CRUD infrastructure. | A future business module needs zero Admin Shell changes to register real screens — proved immediately by Phase 2.2. |
| **Phase 2.2** | Commerce Foundation — the Catalog Engine, in two slices (Slice 1: taxonomy CRUD + basic Products; 2.2A: Product Editor UX redesign; Slice 2: Variants/Media/Organization/Activity) — plus the standing headless-first principle. | The Module Registration Framework, the headless-first discipline, and the Admin Engine's shared infrastructure all hold under a real, non-trivial business module — the pattern every future Commerce module now follows. |

## 6.2 Future — Commerce completion

Sequenced by the real dependency graph `04_MODULE_ARCHITECTURE.md` §5 already fixes, not by convenience:

| Phase | Module(s) | Why this phase exists, and why now |
|---|---|---|
| **2.3** | **Inventory** (`MODULE:INVENTORY`) | Depends only on Catalog, which exists. Stock levels and movement are the next-most-foundational Commerce capability — Pricing, Promotions, and eventually Checkout all need to know what's actually sellable. |
| **2.4** | **Pricing** (`MODULE:PRICING`) | Depends only on Catalog. Every downstream Commerce module (Promotions, Orders, Checkout) needs a real base price to build against — this must exist before any of them can be built honestly, rather than assumed. |
| **2.5** | **Customers** (`MODULE:CUSTOMERS`) Admin UI | The backend module already exists (Phase 1). Orders' own dependency on Customers (`MODULE:COMMERCE`'s Orders entry: "who ordered it") means Customers' admin surface should exist before Orders' does, so an operator can see who they're looking at. |
| **2.6** | **Orders** (`MODULE:ORDERS`) | Depends on Catalog, Pricing, and Customers — all real by this point. This is where "what was sold" becomes visible and manageable for the first time in the Admin UI. |
| **2.7** | **Checkout** (`MODULE:CHECKOUT`) admin-side visibility + **Storefront** scaffold (`ADR-0006`) | Checkout is this platform's heaviest orchestration module (`MODULE:COMMERCE`'s own description: "this project's first module to hold real, exercised code-level dependencies on this many siblings at once") — it is not meaningfully testable without a real place for a customer to actually check out, which is the Storefront. These are sequenced together, not because they are the same module, but because one cannot be honestly verified without the other existing. |
| **2.8** | **Tracking & Analytics** | Customer-behavior and storefront-performance analytics require real Storefront traffic to be meaningful (§4.5) — this phase cannot honestly precede 2.7. |
| **2.9** | **Reports** (`MODULE:REPORTING`) | Operational reporting over everything built so far (Catalog, Inventory, Pricing, Orders, Customers) — deliberately sequenced after the modules it reports on exist, never speculatively ahead of them. |

## 6.3 Future — Beyond Commerce completion

| Phase | Scope | Why |
|---|---|---|
| **Beta** | Milestone B (§8) — private beta on a real merchant installation | The first real, non-synthetic verification of everything built in 6.1–6.2 together, under real operational load, per "Production First" (§3.2). |
| **Production** | Milestone C (§8) — `v1.0` production launch | The platform is trusted with a real, revenue-generating business's operation. |
| **ERP** | Supplier Management depth, multi-warehouse Inventory, multi-company | ERP-*adjacent* capability, per §4.8 and §12 — never a pivot to general ERP. |
| **AI** | The reserved AI surfaces (§4.6) become real, against real operational data that exists by this point | Deliberately sequenced last among near-term capability, not first, per §4.6's own reasoning. |
| **Marketplace** | Both senses named in §4.7, each on its own track | Extension/Theme distribution tracks the Update Engine (`v3.0.0`, `RELEASE:UPDATE_ENGINE_PREPARATION`); multi-vendor commerce tracks Milestone E (§8). |
| **Distribution** | The Release Package, Update Engine, and self-hosted installer become a real, repeatable distribution mechanism a business can adopt without engineering involvement (`PRINCIPLES:OPERATIONAL_ACCESSIBILITY`) | Formalizes what §11 already designs. |
| **Commercial Platform** | Milestone D (§8) | The point at which neXgen is offered to businesses beyond the ones directly operated by this project — under every constraint `VISION:NON_GOALS` and `VISION:PLATFORM_PROMISES` already fix (self-hosted-first, no forced lock-in, data ownership preserved). |

---

# 7. Launch Gates

**Identifier: ROADMAP:LAUNCH_GATES**

Phases (§6) describe *what gets built and in what order*. Launch Gates describe *what must be true, all at once, before real merchants depend on the platform* — a different, stricter question. A gate is not "green" because its constituent phases shipped; it is green only when the Definition of Done (§13) has been independently re-verified across everything the gate covers, together, per "Production First" (§3.2).

## Gate 1 — Commerce Core

**Covers:** Catalog, Inventory, Pricing, Orders, Customers (Phases 2.2–2.6).
**Green when:** A staff operator can, without developer involvement, create a real sellable product with real stock and a real price, and see a real order recorded against a real customer — the full loop, not each piece verified in isolation.

## Gate 2 — Selling Experience

**Covers:** Checkout, Storefront, Payments (already built, Phase 1), Shipping/Fulfillment (already built, Phase 1) (Phase 2.7).
**Green when:** An anonymous customer can browse the real Storefront, complete a real checkout against real inventory and pricing, pay through a real gateway, and have that order flow into real fulfillment — end to end, on a real deployed instance, not mocked.

## Gate 3 — Marketing & Analytics

**Covers:** Tracking & Analytics, Reports, and the Growth-domain modules this roadmap's later phases reach (Phases 2.8–2.9 and beyond).
**Green when:** The business can see, without engineering involvement, how its store is actually performing — traffic, conversion, and operational reporting all reflecting real data from Gate 1 and Gate 2.

## Gate 4 — Production Readiness

**Covers:** Everything above, plus the full `docs/08_SECURITY_STANDARD.md`, `docs/10_TESTING_STANDARD.md`, and `docs/11_DEPLOYMENT_STANDARD.md` review checklists, plus `docs/RELEASE_MANAGEMENT.md`'s full release process (§6.1–6.4 there).
**Green when:** A Release Candidate has passed the complete `TESTING:RELEASE_VERIFICATION` pass, the Release Package (§7 there) is complete, and rollback capability has been verified, not assumed (`DEPLOYMENT:ROLLBACK_PHILOSOPHY`).

**Nothing launches unless all four gates are green.** A gate is not partially satisfied — it is either fully re-verified together, or it is not yet green, regardless of how complete its individual constituent phases look.

---

# 8. Milestones

**Identifier: ROADMAP:MILESTONES**

| Milestone | Name | Definition |
|---|---|---|
| **A** | Commerce Foundation Complete | Gate 1 (§7) green. The Catalog Engine (Phase 2.2, already delivered) plus Inventory, Pricing, Customers, and Orders (Phase 2.3–2.6) all real and verified together. |
| **B** | Private Beta — `store.weshopbd.com` | Gate 1 and Gate 2 (§7) green, deployed to a real, named installation, running real (not synthetic) merchant operations under direct observation before wider exposure. |
| **C** | Production `v1.0` — Lokkisona | Gate 4 (§7) fully green. The first installation this platform is trusted to run as a real business's production system of record, per `VISION:SUCCESS_DEFINITION`. |
| **D** | Commercial Release | The platform is offered to businesses beyond the ones this project directly operates, under `VISION:PLATFORM_PROMISES`' full set of commitments (self-hosted choice, data ownership, no forced lock-in) — the "Commercial Platform" phase in §6.3, `v3.0.0` per `RELEASE:SEMVER_POLICY` §4.3. |
| **E** | Enterprise Platform | Multi-store/multi-brand and multi-company operation (§12), and — for the businesses that choose it — multi-vendor marketplace and SaaS multi-tenancy, per `VISION:AUDIENCE` tiers 3–5, reached last and only once tiers 1–2 are already well served. |

---

# 9. Release Strategy

**Identifier: ROADMAP:RELEASE_STRATEGY**

`docs/RELEASE_MANAGEMENT.md` (`RELEASE:TAG_STRATEGY`) is the authoritative, binding source for how a release is actually tagged and shipped — this section does not redefine it, only maps this roadmap's milestone language onto it and names the stages that document's tag taxonomy does not yet have its own row for.

| Stage | Meaning here | Maps to `RELEASE:TAG_STRATEGY` |
|---|---|---|
| **Development** | Ordinary day-to-day work on `main` between releases. | Developer Build (untagged) |
| **Internal** | A milestone verified only within the project itself, no external exposure. | Alpha |
| **Alpha** | Early, incomplete validation — no compatibility guarantee. | Alpha (`vX.Y.Z-alpha.N`) |
| **Private Beta** | Milestone B (§8) — a named, real installation, direct observation, not yet publicly offered. | Beta (`vX.Y.Z-beta.N`), scoped to one installation |
| **Public Beta** | Wider pre-release validation once Private Beta has proven stable — new, named here because `RELEASE_MANAGEMENT.md`'s existing Beta tag already covers the *mechanism*; this is the specific *use* of that mechanism once more than one installation is involved. | Beta (`vX.Y.Z-beta.N`), multiple installations |
| **Stable** | A tagged Release (§8 Milestone C onward) — the normal, supported state of the platform. | Release (`vX.Y.Z`) |
| **LTS** | A MAJOR version line (`RELEASE:SEMVER_POLICY` §4.3) that continues receiving PATCH-level fixes after the next MAJOR has shipped, for merchants who cannot upgrade immediately — new here, since `RELEASE_MANAGEMENT.md` names `release/vX.Y` maintenance branches (§5.1 there) but does not yet state which lines receive LTS treatment. This roadmap states the rule: **the MAJOR version active at Milestone C (Production `v1.0`, §8) receives LTS support** — a business running its real production system of record must never be forced onto an unproven MAJOR line to keep receiving security patches. |

---

# 10. Versioning Strategy

**Identifier: ROADMAP:VERSIONING**

`RELEASE:SEMVER_POLICY` is the authoritative source — Semantic Versioning 2.0.0, applied at the whole-repository level, with the canonical version → capability table already maintained there (`RELEASE:SEMVER_POLICY` §4.3). This roadmap does not maintain a second, competing version table; §6 and §8 of this document describe *what* ships and *why it's sequenced that way*, and `RELEASE_MANAGEMENT.md` §4.3 remains the one place that states *which version number* it ships under. As phases in §6 complete, `RELEASE_MANAGEMENT.md` §4.3 is updated through its own `GOVERNANCE:CHANGE_MANAGEMENT` process — never silently reinterpreted here.

Restated briefly, since it governs how every phase in §6 is perceived externally:

- **MAJOR** — a new platform capability tier goes live (shippable, verified — not merely designed).
- **MINOR** — a complete, production-ready module or engine ships within the current MAJOR tier, no breaking change to any existing public contract.
- **PATCH** — bug fixes, security patches, hardening, documentation-only governance updates.

**Long-term support** is defined in §9: the MAJOR line active at Milestone C receives PATCH-level support for as long as any merchant runs a production installation on it, independent of how far ahead of it development on `main` has moved.

---

# 11. Update Strategy

**Identifier: ROADMAP:UPDATE_STRATEGY**

`RELEASE:UPDATE_ENGINE_PREPARATION` is the authoritative source for the binding design principles a future Update Engine must be built against — this section restates them at the roadmap level and does not duplicate their detail:

- **Official Update Server** — the same provider-trio pattern (Contract + Registry/Factory/Resolver) already used for Payments' gateways, Shipping's couriers, Notifications' channels, and Search's engines. Not a new mechanism invented for updates specifically.
- **Patch updates** — SemVer-declared compatibility ranges, checked before an update is offered, never applied blind.
- **Rollback** — redeploying the immediately-prior Release tag's package; a failed release's tag and package are never deleted, so the failure stays diagnosable (`DEPLOYMENT:ROLLBACK_PHILOSOPHY`).
- **Backup** — a mandatory, verified precondition of applying any update, not a documentation suggestion — restated here as a roadmap-level requirement of the eventual Update Center's own workflow (below), since `RELEASE_MANAGEMENT.md` establishes the rollback mechanism but the *forced-backup-before-update* UX is this document's own addition, consistent with `PRINCIPLES:MERCHANT_FIRST`: an update must never be able to strand a merchant with no way back.
- **Module / theme / extension compatibility** — every module carries a `MODULE:STABILITY` classification governing how freely its contract may change; every theme package is bound to the `ThemePackage` contract `docs/frontend/THEME_ENGINE_ARCHITECTURE.md` already defines. An update, extension, or theme declares the SemVer range of core it requires and is never installed outside that range.
- **Future Update Center** — the eventual admin-facing surface over the Update Engine (`PRINCIPLES:OPERATIONAL_ACCESSIBILITY`: applying an update must be achievable by the people running the business, not only by an engineer with shell access). Targeted alongside `v3.0.0` (§10), sequenced with the "Distribution" phase in §6.3.

---

# 12. Long-term Architecture Goals

**Identifier: ROADMAP:LONG_TERM_ARCHITECTURE**

Every capability below is designed as a **module inside the same Commerce Operating System** (`ARCH:DOMAIN_MAP`), never as a reason to fork the architecture or bolt on a second system. This is the direct consequence of `ARCH:ARCHITECTURAL_STYLE`'s modular-monolith decision and `ARCH:DATA_OWNERSHIP`'s tenant-boundary-designed-in-from-day-one commitment: every one of these goals is reachable by adding modules and activating already-anticipated boundaries, not by redesigning the platform to reach it.

## 12.1 ERP-adjacent depth

**Supplier Portal** extends `MODULE:SUPPLIER_MANAGEMENT` (Operations, already boundaried) with a supplier-facing interface. **WMS** extends Inventory's already-named multi-warehouse seam (`planning/IMPLEMENTATION_MASTER_PLAN.md`: "Multi-Warehouse (full) extends Inventory, which was deliberately built single-warehouse-only in Phase 1 with the multi-warehouse seam already named"). **Multi-company** extends `MODULE:STORE_CONFIGURATION`'s Organizations concept (already named in the master plan's Organizations & Multi-Store module) — one business entity owning several stores/brands under one installation. None of these require a new domain; all three live in Platform or Operations, exactly where they are already boundaried.

## 12.2 CRM

`MODULE:CRM` (Growth) is designed for, not built in, Phase 1 or Phase 2, per `ARCH:DOMAIN_MAP`. It consumes Commerce and Operations events for customer-relationship insight and is never depended upon by anything it observes (`MODULE:COUPLING_RULES`).

## 12.3 POS

Not a named module in `04_MODULE_ARCHITECTURE.md` today. When built, it is architecturally identical to Storefront and a future mobile app: another consumer of the same public Catalog/Orders/Inventory/Pricing contract, per "Headless Ready" (§3.2) — never a special-cased backend path.

## 12.4 AI

Per §4.6, AI is a consumer of the event bus (`ARCH:CROSS_DOMAIN_COMMUNICATION`) and the public API contract, exactly like every other future surface named in this section. "AI Ready" (§3.2) is what makes this possible without a redesign: every module already publishes the events an AI/automation capability would need, whether or not one exists yet to consume them.

## 12.5 Marketplace (both senses)

Restated from §4.7 for completeness: Extension/Theme distribution via the Update Engine (§11, `v3.0.0`), and multi-vendor commerce as a Milestone E (§8) capability tier — never the default, never required to use the rest of the platform, per `VISION:NON_GOALS`.

## 12.6 Multi-company / Multi-tenant

The event bus is already built as an abstraction specifically so a future move to a distributed broker — should real SaaS multi-tenancy require extracting a domain into its own service — is an *extension of the existing interface, not a redesign* (`ARCH:CROSS_DOMAIN_COMMUNICATION`). Multi-tenancy activates a boundary every module's data ownership has designed in, unexercised, since Phase 1 (`ARCH:DATA_OWNERSHIP`, `MODULE:DEFINITION`) — it is not a future migration project, it is turning on something already structurally present.

---

# 13. Definition of Done

**Identifier: ROADMAP:DEFINITION_OF_DONE**

A feature, module, or phase is not complete until every item below is true — this restates and binds `GOVERNANCE:COMPLETION_RULE` at the phase-execution level, matching what every phase since 2.1 has actually been held to in practice:

- [ ] **Implementation** — built against the real, read backend contract (or, for backend work, against the accepted module boundary) — nothing invented.
- [ ] **Tests** — unit tests for new logic; integration/e2e tests for new user-facing flows; all passing.
- [ ] **Accessibility** — zero critical/serious automated violations (`@axe-core`), keyboard-operable, matching `docs/07_UI_DESIGN_SYSTEM.md`'s baseline.
- [ ] **Performance** — verified against a realistic data volume, not an empty database, per "Performance First" (§3.2).
- [ ] **Responsive** — verified live at real breakpoints, not assumed from desktop-only review.
- [ ] **Documentation** — `CHANGELOG.md` and `PROJECT_STATUS.md` updated in the same change.
- [ ] **Product Owner Review** — the completion report presented, and explicit approval received, before the next phase begins.
- [ ] **Git** — committed, pushed, `HEAD == origin/main`, working tree clean, no secrets committed.
- [ ] **Completion Report** — architecture summary, what shipped, bugs found/fixed, quality gate results, what remains, commit SHA, verification results.

**Everything passes. Not "everything passes except..."** A phase with an open item in this list is not done — it is in progress, and is reported as such, per `PRINCIPLES:EXPLICIT_FAILURE`.

---

# 14. What neXgen Will Never Become

**Identifier: ROADMAP:BOUNDARIES**

This section exists to protect the vision in §1 from erosion, one reasonable-sounding exception at a time — the same purpose `VISION:NON_GOALS` already serves, restated here because a roadmap is exactly the kind of document under which scope creep tends to enter, disguised as a sequencing decision rather than a vision change. The first eight boundaries below are `VISION:NON_GOALS` §7, unchanged — this document has no authority to loosen a boundary that document already fixed. The ninth is this roadmap's own direct synthesis of §1.2's "not an ERP / not a CMS" framing, added here because §12's long-term goals make it a live risk this document specifically must guard against, even though `VISION:NON_GOALS` itself does not name ERP or CMS explicitly:

- **Never requires vendor-hosted infrastructure to operate.** Self-hosting remains real and complete at every milestone in §8, including Milestone D (Commercial Release) and Milestone E (Enterprise Platform).
- **Never locks a merchant out of their own data.** No milestone, gate, or long-term goal in this document introduces a data-export limitation, a proprietary retention format, or partner-only access to a merchant's own records.
- **Never trades data ownership for convenience.** Applies with equal force to every AI, automation, and marketplace capability in §12 — none of them may require surrendering control of business data to function.
- **Never becomes primarily a plugin/theme marketplace.** The Marketplace capability in §4.7 and §12.5 is a distribution channel; core operational capability stays in the core, at every milestone.
- **Never becomes a website builder wearing operational software as a feature.** Storefront (§4.2) and CMS remain one capability among many, never the platform's center of gravity, however far Phase 2.7 onward develops them.
- **Never requires adopting unrelated modules to use the one a business actually needs.** A merchant using Catalog, Inventory, and Orders is never forced to enable or pay for CRM, Marketing, or Automation to keep using what they already have.
- **Never optimizes short-term feature count over architectural integrity.** No phase in §6 is sequenced ahead of its real dependencies (§6.2's own ordering rationale exists specifically to prevent this) merely to hit a roadmap date faster.
- **Never treats forced, non-optional updates as acceptable.** The Update Center (§11) always leaves the decision of when and whether to update with the business running the installation — at every milestone through Enterprise Platform.
- **Never becomes a generic ERP, CRM, or website-builder product with commerce bolted on.** Every capability in §12 is a module inside the Commerce Operating System (§1); none of them is ever allowed to become the platform's primary identity in place of commerce.

If a future proposal cannot be reconciled with every boundary above, the proposal is rejected — this document is revised only through the same `GOVERNANCE:CHANGE_MANAGEMENT` process that governs every other Accepted document, never by a phase quietly drifting past it.

---

End of Document
