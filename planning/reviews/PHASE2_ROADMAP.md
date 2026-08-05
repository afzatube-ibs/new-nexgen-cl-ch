# neXgen Core — Phase 2 Roadmap (and the Phase 1 Work That Precedes It)

| Field | Value |
|---|---|
| **Report** | Phase 2 Roadmap |
| **Date** | 2026-08-05 |
| **Companion** | `PHASE1_BACKEND_COMPLETION_REPORT.md` |

---

## 1. This Roadmap Assumes Phase 1 Finishes First

`PHASE1_BACKEND_COMPLETION_REPORT.md` concludes Backend Phase 1 is not yet complete. Nothing in this document proposes starting Phase 2 (v1.1) work before that gap closes — the master plan's own Implementation Order is sequential and dependency-respecting (each Phase 1 module was built in an order that satisfies every earlier module's dependency line; Phase 2 modules were scoped assuming a complete Phase 1 foundation, not a partial one). This roadmap exists to answer "what comes after," not to suggest starting it early.

---

## 2. Remaining Phase 1 Work (Restated From the Completion Report, for Sequencing Context Only)

1. Shipping & Logistics (basic)
2. Fulfillment
3. Returns, Exchanges & Refunds (basic)
4. Notifications & Email (basic)
5. Search (basic)
6. Hardening pass (`SECURITY:REVIEW_CHECKLIST`, `TESTING:REVIEW_CHECKLIST`, `DEPLOYMENT:REVIEW_CHECKLIST`, platform-wide)

Full rationale for each is in `PHASE1_BACKEND_COMPLETION_REPORT.md` §6. Recommended build order follows the master plan's own Sprint Group E ("Fulfillment Path": Shipping & Logistics → Fulfillment → Returns/Exchanges/Refunds) then Sprint Group F ("Launch Readiness": Notifications & Email → Search → hardening pass), since Fulfillment's own dependency on a real shipping method and Returns' dependency on Payments' `RefundableGateway` extension point make that ordering load-bearing, not arbitrary.

---

## 3. Admin UI Sequencing

The user's original review request asked, among other things, whether the backend is "ready for Admin UI development." The answer, given Phase 1's incompleteness, is not yet — but two things can be prepared in parallel with the remaining backend work above, since neither depends on it:

- **Move `ADR-0005` (Admin Interface — React + TypeScript) from Draft to Accepted.** The decision itself is final and unambiguous already; only the governance status is outstanding. This is a paperwork step, not an engineering one, and there is no reason to leave it blocking on backend completion.
- **Admin UI scaffolding against the 14 already-stable API contracts** (Identity & Access, Catalog, Customers, Orders, Payments, etc.) could reasonably begin once ADR-0005 is Accepted — those contracts are unlikely to change shape once Shipping/Fulfillment/Returns/Notifications/Search are added, since those new modules add new endpoints rather than changing existing ones. This is a judgment call for the Product Owner, not a recommendation this report makes unilaterally, since "ready for Admin UI development" was explicitly asked as a Phase 1 gate in the original review request, and this report's answer to that specific question is the one in `PHASE1_BACKEND_COMPLETION_REPORT.md`: not yet, in full — full Admin UI development against a complete, stable backend surface should wait for the six items in §2.

---

## 4. Phase 2 (v1.1) — Operational Depth

Per the master plan's own Release Roadmap, once Phase 1 v1.0 is frozen:

> Multi-Warehouse (full), Suppliers/PO/Stock Transfer, Theme System, Extension System, File Manager, Upgrader, SMS & WhatsApp, Reviews, Wishlist & Compare, Search (advanced), SEO, CMS & Landing Page Builder, Blog, Webhooks & Integrations, CRM (basic), Dashboards, localization/currency (full).

**Mandatory for v1.1** (the master plan's own words): **Upgrader** — "a platform that shipped v1.0 must be able to upgrade to v1.1 — this is not optional" — and **Extension System** — "the first real test of `MODULE:EXTENSIBILITY_MECHANISM`."

**Optional/deferrable within v1.1 if schedule pressure requires a cut line:** Blog, SEO — everything else in this phase is stated as materially load-bearing for "operational depth" as a release theme and should not be cut without a documented decision.

### 4.1 What Phase 2 Builds On From Phase 1

Several Phase 2 items are direct extensions of Phase 1 modules already delivered, not new domains:

- **Multi-Warehouse (full)** extends Inventory, which was deliberately built single-warehouse-only in Phase 1 with the multi-warehouse seam already named in its own docblocks.
- **Search (advanced)** extends Search (basic), a Phase 1 module not yet built — sequencing here is straightforward once basic Search exists.
- **Localization/currency (full)** extends the Phase 1 "basic" delivery — the translation-surface responsibility the master plan's own Localization entry already names as deferred.
- **CRM (basic)** and **Dashboards** both consume the audit-log and event architecture already built across all 14 Phase 1 modules — no new cross-cutting infrastructure is needed, only new modules reading what already exists.
- **Extension System** is the first real exercise of the `MODULE:EXTENSIBILITY_MECHANISM` every Phase 1 module was built anticipating (event-subscription-only, config-surface-only extension points) — see `ARCHITECTURE_REVIEW.md` §7. This is a substantial new capability, not a small one, and should not be underestimated in Phase 2 planning: it is the first time any module's own event-publishing discipline (36 events, 0 subscribers today) will be exercised by code this project does not itself own.

### 4.2 What Phase 2 Should Watch For, Based on This Review

- **Event bus consumption is entirely unproven** (`ARCHITECTURE_REVIEW.md` A-4). Phase 2's Extension System, plus Phase 1's own still-pending Fulfillment and Notifications modules, will be the first real subscribers this platform has ever had. Budget real integration-testing time for this, not just unit tests of the publish side (which is already well-tested).
- **Rate limiting and CORS** (`SECURITY_REVIEW.md` S-4, S-5) should be closed out in the Phase 1 hardening pass, before Phase 2 adds Webhooks & Integrations — a module whose entire purpose is accepting more inbound traffic from more external systems, which makes an already-open gap materially worse if left unaddressed.
- **No performance test suite exists yet** (`PERFORMANCE_REVIEW.md` P-2). Establish one during the Phase 1 hardening pass so Phase 2's heavier modules (multi-warehouse, CRM, dashboards — all read-heavy) have a baseline to be measured against rather than being the first place a performance regression is ever noticed.

---

## 5. Phase 3 (v1.2) and Phase 4 (v2.0) — No Action Needed Now

Per the master plan, Phase 3 (Marketing & Automation, Dropshipping, Shipping & Logistics depth, CRM advanced, Analytics advanced, Fraud Protection activated) and Phase 4 (Marketplace/Multi-Vendor/SaaS/AI/ERP Readiness) remain correctly out of scope for any near-term planning. One correction already noted in `TECHNICAL_DEBT_REPORT.md` §3: Promotions & Coupons' full advanced engine — originally Phase 3 scope — was already delivered in Phase 1 at the Product Owner's explicit direction, so Phase 3's own Promotions line item is already satisfied and should be removed or marked complete when Phase 3 planning begins, to avoid double-counting work already done.

---

## 6. Summary Recommendation

1. Finish the six remaining Phase 1 items (§2) before freezing Backend API v1.0.
2. In parallel, move `ADR-0005` to Accepted — no dependency on backend completion.
3. Do not begin full Admin UI development against the backend's public contract until Phase 1 is frozen — five new modules will each add new API surface Admin UI would otherwise need to be reworked to cover.
4. Once Phase 1 is frozen, Phase 2's two mandatory items (Upgrader, Extension System) should be sequenced first within v1.1, both because the master plan states them as mandatory and because Extension System is the first genuine exercise of infrastructure (the event bus's subscribe side) every Phase 1 module was built anticipating but never tested.
