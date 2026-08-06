# neXgen Core — Project Status

| Field | Value |
|---|---|
| **Last Updated** | 2026-08-08 |
| **Current Phase** | Implementation — Phase 1. 17 of 19 Phase 1 modules complete (per `planning/reviews/PHASE1_BACKEND_COMPLETION_REPORT.md`, 2026-08-05, plus Shipping & Logistics, Fulfillment, and Returns/Exchanges/Refunds completed 2026-08-06/07/08). Backend Phase 1 is **not yet complete** — Notifications & Email, Search, and the mandatory hardening pass remain |
| **Implementation Status** | Authorized by Product Owner 2026-08-02. Building module by module per `planning/IMPLEMENTATION_MASTER_PLAN.md`, resequenced by explicit Product Owner direction (2026-08-03) to prioritize the highest-leverage foundational business modules — Catalog, Media, Inventory — ahead of their originally-listed Implementation Order position; strictly backend throughout |

This file is a snapshot for anyone joining the project. For authoritative document status and review history, see [`docs/README.md`](docs/README.md) and each document's own Change Log.

## Foundation Documents

| # | Document | Status |
|---|----------|--------|
| 00 | PROJECT_GOVERNANCE | ✅ Accepted (v1.6) |
| 01 | PRODUCT_VISION | ✅ Accepted (v0.2) |
| 02 | PRODUCT_PRINCIPLES | ✅ Accepted (v1.0) |
| — | SYSTEM_ARCHITECTURE_PLAN | 🟢 Closed out (v0.3) |
| 03 | SYSTEM_ARCHITECTURE | ✅ Accepted (v1.2) |
| — | ADR-0001, 0002, 0003, 0004, 0007, 0008 | ✅ Accepted |
| — | ADR-0005, ADR-0006 | 🟡 Draft (deferred to their implementation phases) |
| 04 | MODULE_ARCHITECTURE | ✅ Accepted (v1.1) |
| 05 | DATA_ARCHITECTURE | ✅ Accepted (v1.0) |
| 06 | API_STANDARD | ✅ Accepted (v1.0) |
| 07 | UI_DESIGN_SYSTEM | ✅ Accepted (v1.0) |
| 08 | SECURITY_STANDARD | ✅ Accepted (v1.0) |
| 09 | ENGINEERING_STANDARD | ✅ Accepted (v1.0) |
| 10 | TESTING_STANDARD | ✅ Accepted (v1.1) |
| 11 | DEPLOYMENT_STANDARD | ✅ Accepted (v1.0) |

## Team

| Role | Owner |
|---|---|
| Product Owner | User (final authority on product direction) |
| Product & Solution Architect | ChatGPT |
| Chief Software Architect & Lead Engineer | Claude |
| Version Control / Git Operations | Cursor (git only — no drafting, review, or architecture authority) |

## Implementation Progress (Phase 1)

| # | Module | Status |
|---|--------|--------|
| 1 | Platform Foundation | ✅ Complete |
| 2 | Identity & Access | ✅ Complete |
| 3 | Organizations & Stores (`MODULE:STORE_CONFIGURATION`) | ✅ Complete |
| 4 | Media (`MODULE:MEDIA`) | ✅ Complete — built ahead of its master-plan sequence position because Catalog required it |
| 5 | Localization & Currency (`MODULE:LOCALIZATION`, basic) | ✅ Complete |
| 6 | Installer (`MODULE:INSTALLER`) | ✅ Complete |
| 7 | Customers (`MODULE:CUSTOMERS`) | ✅ Complete |
| 8 | Catalog (`MODULE:CATALOG`) | ✅ Complete — built ahead of its master-plan sequence position per explicit Product Owner priority direction |
| 9 | Pricing & Tax (`MODULE:PRICING`, basic) | ✅ Complete |
| 10 | Promotions & Coupons (`MODULE:PROMOTIONS`, basic) | ✅ Complete — full Phase 3 advanced engine delivered early, at explicit Product Owner direction |
| 11 | Inventory & Multi-Warehouse (`MODULE:INVENTORY`, single-warehouse scope) | ✅ Complete — built ahead of its master-plan sequence position for the same reason as Media |
| 12 | Checkout (`MODULE:CHECKOUT`) | ✅ Complete — guest checkout delivered early, at explicit Product Owner direction |
| 13 | Orders (`MODULE:ORDERS`) | ✅ Complete |
| 14 | Payments (`MODULE:PAYMENTS`) | ✅ Complete — Bangladesh-first: COD/Bank Transfer functional, SSLCommerz/bKash/Nagad production-ready architecture |
| 15 | Shipping & Logistics (`MODULE:SHIPPING`, basic) | ✅ Complete (2026-08-06) — Operations domain (first Operations-domain module built); shipping zones/methods/rates, provider-agnostic Courier Registry (Steadfast, Pathao, RedX, Paperfly, Sundarban, eCourier, Manual), rate-query Public Contract. Deliberately excludes the Shipment aggregate/tracking/label execution, which the accepted `docs/04_MODULE_ARCHITECTURE.md` (`MODULE:SHIPPING` vs `MODULE:FULFILLMENT`) reserves for the future Fulfillment module — see that module's own entry below |
| 16 | Fulfillment (`MODULE:FULFILLMENT`) | ✅ Complete (2026-08-07) — Operations domain; Shipment aggregate (items, timeline, notes), full Pick/Pack/Dispatch workflow and status lifecycle, courier hand-off exclusively through Shipping's `Couriers\ShippingProviderContract` (no courier-specific logic in this module), reacts to Orders' `OrderPlaced` via a dedicated cross-domain integration listener (`app/Listeners/CreateShipmentOnOrderPlaced.php`) rather than any direct dependency on Orders |
| 17 | Returns, Exchanges & Refunds (`MODULE:RETURNS`) | ✅ Complete (2026-08-08) — Operations domain; `ReturnRequest`/`RefundRequest`/`ExchangeRequest` as three independent aggregate roots (per `DATA:AGGREGATE_BOUNDARIES` — RefundRequest's status changes on its own async trigger, distinct from ReturnRequest's operator-driven ones), RMA numbering, Return Status Lifecycle (`requested → approved → pickup_scheduled → received → inspecting → resolution_approved → completed`, with rejection/cancellation paths), timeline/notes/audit trail. Refund processing routes exclusively through Payments' `RefundPaymentAction` (a new, additive extension of that module's own previously-unexercised `RefundableGateway` seam) via a bidirectional cross-domain event bridge (`ReturnResolved` → `PaymentRefunded`) through two more dedicated integration listeners in `app/Listeners/`, never a direct call — "a refund never occurs without an associated Payments module transaction reference" is enforced structurally. Courier pickup validates against Shipping's `Couriers\ProviderRegistry` (same-domain call, permitted within Operations) but records collection manually, honestly, since no courier publishes a verified reverse-pickup API. Exchange request/lifecycle built now; exchange-triggered inventory reservation remains a named Phase 2 extension point |
| 18 | Notifications & Email (basic) | ⬜ Not yet started |
| 19 | Search (basic) | ⬜ Not yet started |
| 20 | Hardening pass (full `SECURITY:REVIEW_CHECKLIST`/`TESTING:REVIEW_CHECKLIST`/`DEPLOYMENT:REVIEW_CHECKLIST`) | ⬜ Not yet started |

## What's Next

All 12 foundation documents (`00`–`11`) are Accepted. `ADR-0001`, `0002`, `0003`, `0004`, `0007`, and `0008` — the six Platform Foundation depends on — reached Accepted status on 2026-08-02 with Product Owner confirmation. `ADR-0005` (admin interface) and `ADR-0006` (storefront rendering) remain Draft until the modules that need them are reached.

**2026-08-03 resequencing:** the Product Owner directed that Catalog, Media, and Inventory be completed as one "Commerce Core" milestone ahead of `planning/IMPLEMENTATION_MASTER_PLAN.md`'s originally-listed Implementation Order. This was a sequencing change only — no constitutional document, ADR, or the master plan's own content required a correction.

**2026-08-05:** `planning/reviews/PHASE1_BACKEND_COMPLETION_REPORT.md` found Backend Phase 1 **not complete** — 14 of 19 modules built, 5 remaining (Shipping & Logistics, Fulfillment, Returns/Exchanges/Refunds, Notifications & Email, Search) plus the mandatory hardening pass, per that report's §6.

**2026-08-06:** Shipping & Logistics (basic) implemented per the Phase 1 completion report's §6 item 1, at `MODULE:SHIPPING`'s accepted scope only (method/zone/rate configuration and the rate-query Public Contract) — the Shipment execution/tracking/label responsibility the report's item 1 also touches on remains correctly scoped to the still-unbuilt Fulfillment module (item 2), per `docs/04_MODULE_ARCHITECTURE.md`'s existing `MODULE:SHIPPING`/`MODULE:FULFILLMENT` split.

**2026-08-07:** Fulfillment implemented per the Phase 1 completion report's §6 item 2 — pick/pack/dispatch workflow, courier reference tracking, fulfillment audit trail, reacting to `OrderPlaced`. Extended Shipping's `Couriers\ShippingProviderContract` additively (`bookShipment()`/`supportsBooking()`, exactly as that contract's own original docblock anticipated) rather than duplicating any courier-specific logic inside Fulfillment. Registered this platform's first real, production cross-domain event subscription (`ARCHITECTURE_REVIEW.md` A-4's anticipated first real subscriber) via a dedicated integration listener living outside every domain's own namespace, keeping both Orders and Fulfillment's own code free of any reference to the other.

**2026-08-08:** Returns/Exchanges/Refunds implemented per the Phase 1 completion report's §6 item 3 — the last remaining Commerce-facing module before Notifications & Email, Search, and the hardening pass. Extended Payments additively with refund columns/statuses and `RefundPaymentAction` (calling the `RefundableGateway` seam that module's own `bKash` gateway had left unexercised specifically for this). While building this module's own cross-domain listeners, a **self-review caught and fixed a platform-wide defect predating this delivery**: Laravel's automatic `app/Listeners` event auto-discovery (enabled by default since `Application::configure()`) was silently double-registering every cross-domain listener alongside this platform's own explicit `DomainEventBus::subscribe()` composition root in `AppServiceProvider`, including the pre-existing Fulfillment `CreateShipmentOnOrderPlaced` listener from 2026-08-07 — masked until now only because that handler happens to be idempotent. Fixed by disabling Laravel's discovery (`bootstrap/app.php`, `->withEvents(discover: false)`), leaving `app/Listeners/*` wired exclusively through the platform's own explicit contract. Notifications & Email, Search, and the hardening pass remain and are next.

## Repository Structure

See root [`README.md`](README.md) for the full folder layout. `apps/backend` now holds the Platform Foundation, Identity & Access, Organizations & Stores, Media, Localization & Currency, Installer, Customers, Catalog, Pricing & Tax, Promotions & Coupons, Inventory, Checkout, Orders, Payments, Shipping & Logistics, Fulfillment, and Returns/Exchanges/Refunds implementations. `packages/`, `tooling/`, `scripts/`, `tests/`, and `docker/` remain populated only as each module requires.
