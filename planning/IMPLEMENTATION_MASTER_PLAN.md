# neXgen Core
## IMPLEMENTATION_MASTER_PLAN

| Field | Value |
|---|---|
| **Title** | Implementation Master Plan |
| **Document Type** | Execution artifact — NOT a constitutional document |
| **Version** | 1.0 (Draft) |
| **Status** | Draft |
| **Author** | Chief Software Architect & Lead Engineer |
| **Last Updated** | 2026-08-02 |
| **Derived From** | `00_PROJECT_GOVERNANCE` through `11_DEPLOYMENT_STANDARD` (all Accepted) |
| **Applies To** | Cursor (or any implementer) executing neXgen Core module by module |

---

## A Note on This Document's Place in the Project

This is **not** the twelfth constitutional document. `00`–`11` are closed, Accepted, and this plan does not amend, extend, or reopen any of them. Every module below is a concrete instantiation of a domain, boundary, or rule those documents already established — most map directly onto a module already named in `04_MODULE_ARCHITECTURE`; the rest are new modules this plan proposes, consistent with those documents' rules, but not yet formally added to `04`'s module list. Where a proposed module would need to be formally added to `04_MODULE_ARCHITECTURE` before implementation begins, that is noted explicitly.

This document contains no code, no schema, no endpoint definitions, no framework references beyond what `03_SYSTEM_ARCHITECTURE`'s ADRs already establish (PHP/Laravel, MySQL, Redis, React, Next.js, REST/OpenAPI, Docker). It is a planning and sequencing artifact.

---

# Part 1 — Phase Model

Four phases, matching the release roadmap requested:

- **Phase 1 — v1.0 — Mandatory Production Baseline.** A merchant can run a real, single-store, self-hosted commerce operation end to end. Nothing here is optional; this is the minimum for `VISION:SUCCESS_DEFINITION` to be true.
- **Phase 2 — v1.1 — Operational Depth.** The platform grows from "works" to "runs a real, growing business well" — multi-warehouse, supplier operations, deeper content and discovery tooling, deeper reporting.
- **Phase 3 — v1.2 — Growth & Scale.** Marketing and automation capability, advanced promotions, dropshipping, fraud protection activated, multi-store exercised at real scale.
- **Phase 4 — v2.0 — Platform Expansion.** Everything `VISION:AUDIENCE` names as later-priority: marketplace/multi-vendor, SaaS multi-tenancy actually activated, AI capability, ERP-adjacent readiness. This phase is explicitly where `VISION:NON_GOALS`'s Phase 1 exclusions (marketplace, SaaS, ERP replacement) get revisited — not violated, revisited, per that document's own terms.

Every module below is tagged with its phase. A module tagged **Phase 4 — Optional/Enterprise**, **Phase 4 — SaaS-only**, or **Phase 4 — AI-only** is explicitly not required for any merchant not opting into that capability — this mirrors `MODULE:STABILITY`'s Experimental classification and `04_MODULE_ARCHITECTURE`'s "designed for, not built" language for Growth-domain modules.

---

# Part 2 — Module Catalog

Each module below covers: Purpose, Responsibilities, Dependencies, Public Contracts, Events, Data Ownership, Security Considerations, Future Extension Points, Priority/Phase, Complexity, Acceptance Criteria. Requested items are listed under **Covers** so nothing from the original 72 is dropped.

## Platform Domain

### 1. Platform Foundation
**Covers:** #1 Platform Foundation
**Phase:** 1 (P0 — prerequisite to everything)
- **Purpose:** The modular monolith runtime itself — the Application Unit, Background Workers, and the internal domain event bus, as `ARCH:ARCHITECTURAL_STYLE` and `ARCH:CROSS_DOMAIN_COMMUNICATION` define them.
- **Responsibilities:** Boot the application; wire the domain event bus; expose the health signals `ARCH:NFR` and `DEPLOYMENT:OPERATIONAL_READINESS` require; host every other module.
- **Dependencies:** None — everything else depends on this.
- **Public Contracts:** None externally; internally, the event-bus interface every module publishes to and subscribes through.
- **Events:** None of its own; it is the transport every other module's events travel on.
- **Data Ownership:** None — it owns no business data, per `ARCH:ARCHITECTURAL_STYLE`.
- **Security Considerations:** The event bus must enforce `SECURITY:EVENT_SECURITY` — a subscriber receives only what a publisher intended.
- **Future Extension Points:** The event-bus abstraction must remain swappable for a distributed broker without redesign, per `ARCH:CROSS_DOMAIN_COMMUNICATION`, for eventual SaaS scale.
- **Complexity:** High (foundational; errors here propagate everywhere).
- **Acceptance Criteria:** All modules can publish/subscribe; health endpoint reports accurately; horizontal scaling of the Application Unit and Workers verified per `TESTING:SCALABILITY_TESTING`.

### 2. Identity & Access
**Covers:** #2 Authentication, #3 Authorization, #4 Users, #5 Staff
**Phase:** 1 (P0)
**Maps to:** `MODULE:IDENTITY_ACCESS`
- **Purpose:** The single source of truth for who a caller is and what they may do, per `SECURITY:IDENTITY` and `API:AUTHENTICATION`.
- **Responsibilities:** User and staff account management; authentication; the role/permission model `SECURITY:ROLES_PERMISSIONS` defines; session lifecycle per `SECURITY:SESSION_MANAGEMENT`.
- **Dependencies:** Platform Foundation only.
- **Public Contracts:** Authenticate, authorize-check, user/staff CRUD, role/permission assignment — all per `MODULE:PUBLIC_CONTRACT`.
- **Events:** `UserRegistered`, `UserAuthenticated`, `UserAuthenticationFailed`, `RoleAssigned`, `SessionRevoked`.
- **Data Ownership:** Users, staff, roles, permissions, sessions — all Sensitive per `DATA:CLASSIFICATION`.
- **Security Considerations:** Every rule in `08_SECURITY_STANDARD` §§5–11 applies directly and fully here; this module is the platform's highest-severity attack surface.
- **Future Extension Points:** Scoped "this installation," ready to narrow to "this tenant" per `SECURITY:PHILOSOPHY`'s multi-tenant-readiness commitment.
- **Complexity:** Very High.
- **Acceptance Criteria:** Full `SECURITY:REVIEW_CHECKLIST` pass; every other module's authorization checks route through this module and none.

### 3. Organizations & Multi-Store
**Covers:** #7 Organizations, #8 Stores
**Phase:** 1 (single-store exercised) / Phase 3 (multi-store at scale)
**Maps to:** `MODULE:STORE_CONFIGURATION` (extended)
- **Purpose:** Owns the business/store profile — identity, currency, locale, operating parameters — per `MODULE:STORE_CONFIGURATION`.
- **Responsibilities:** Store setup and configuration; the organization concept that will hold multiple stores once multi-store is exercised.
- **Dependencies:** Identity & Access (who may configure a store).
- **Public Contracts:** Store configuration read/write.
- **Events:** `StoreConfigurationChanged`.
- **Data Ownership:** Store profile data — Internal classification.
- **Security Considerations:** Configuration changes are audited per `SECURITY:AUDIT_LOGGING`.
- **Future Extension Points:** This is the module where the tenant boundary `ARCH:DATA_OWNERSHIP` designed in from day one is actually exercised when multi-store/SaaS activates.
- **Complexity:** Medium (Phase 1), High (Phase 3, multi-store).
- **Acceptance Criteria:** A store's configuration is fully manageable through the admin interface with no developer involvement, per `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`.

### 4. Media
**Covers:** #15 Media
**Phase:** 1 (P0)
**Maps to:** `MODULE:MEDIA`
- **Purpose:** Owns uploaded assets referenced by every other module, per `MODULE:MEDIA`.
- **Responsibilities:** Upload, storage, retrieval of images and files; enforces `SECURITY:FILE_UPLOAD`.
- **Dependencies:** Platform Foundation, Identity & Access.
- **Public Contracts:** Upload, retrieve-by-identity, delete.
- **Events:** `MediaUploaded`, `MediaDeleted`.
- **Data Ownership:** Media files and metadata — classification varies by content.
- **Security Considerations:** All of `SECURITY:FILE_UPLOAD` — untrusted content, validated against contract, isolated from executable logic.
- **Future Extension Points:** CDN-style distribution is an implementation concern layered on later without changing this module's contract.
- **Complexity:** Medium.
- **Acceptance Criteria:** No module stores media directly; every reference goes through this module's contract, per `DATA:CROSS_MODULE_ACCESS`.

### 5. Theme System
**Covers:** #64 Theme System
**Phase:** 2
**New module — requires formal addition to `04_MODULE_ARCHITECTURE` before implementation.**
- **Purpose:** The concrete implementation of `UI:THEME_SYSTEM`'s token-based customization and `UI:STABILITY_LEVELS`.
- **Responsibilities:** Store and apply theme tokens (color, typography, spacing overrides); enforce that themes change presentation only, per `UI:THEME_SYSTEM`'s explicit rule.
- **Dependencies:** Platform Foundation, Store Configuration.
- **Public Contracts:** Theme configuration read/write; token resolution for frontends.
- **Events:** `ThemeChanged`.
- **Data Ownership:** Theme configuration — Internal.
- **Security Considerations:** A theme must never be a vector for injecting behavior, only presentation — enforced via `UI:THEME_SYSTEM`'s hard rule.
- **Future Extension Points:** Per-tenant theming once SaaS activates.
- **Complexity:** Medium.
- **Acceptance Criteria:** Switching themes changes no interaction behavior, workflow, or information architecture — verified against `UI:THEME_SYSTEM`'s rule directly.

### 6. Extension System
**Covers:** #65 Extension System
**Phase:** 2
**Maps to:** `MODULE:EXTENSIBILITY`, implements `MODULE:EXTENSIBILITY_MECHANISM`
- **Purpose:** The concrete registration, lifecycle, and event/configuration surface `04_MODULE_ARCHITECTURE` §12 already designed.
- **Responsibilities:** Extension registration, activation/deactivation lifecycle, event subscription surface, configuration surface exposure.
- **Dependencies:** Platform Foundation (event bus).
- **Public Contracts:** Register, activate, deactivate, list extensions.
- **Events:** `ExtensionRegistered`, `ExtensionActivated`, `ExtensionDeactivated`.
- **Data Ownership:** Extension registry — Internal.
- **Security Considerations:** An extension's surface is read-only events plus declared configuration, never core logic access, per `SECURITY:EVENT_SECURITY`.
- **Future Extension Points:** This module *is* the future extension point for every other module.
- **Complexity:** High.
- **Acceptance Criteria:** Deactivating an extension never corrupts core module data, per `MODULE:EXTENSIBILITY_MECHANISM`.

### 7. Localization & Currency
**Covers:** #66 Localization, #67 Currency
**Phase:** 1 (basic) / Phase 2 (full)
**New module.**
- **Purpose:** Multi-language and multi-currency support without redesign, per `UI:INTERNATIONALIZATION`.
- **Responsibilities:** Locale and currency configuration; formatting rules; translation surface for Catalog, CMS, and Notifications content.
- **Dependencies:** Store Configuration.
- **Public Contracts:** Locale/currency configuration; translation lookup.
- **Events:** `LocaleAdded`, `CurrencyRateUpdated`.
- **Data Ownership:** Locale/currency configuration and exchange rates — Internal.
- **Security Considerations:** Currency conversion accuracy affects Pricing and Orders — any rate source must be auditable.
- **Future Extension Points:** Per-tenant locale sets under SaaS.
- **Complexity:** Medium.
- **Acceptance Criteria:** Every customer-facing surface renders correctly right-to-left and with variable text length, per `UI:INTERNATIONALIZATION`.

### 8. File Manager
**Covers:** #47 File Manager
**Phase:** 2
**New module (thin layer over Media).**
- **Purpose:** An operator-facing browsing/organization interface over `Media`'s storage.
- **Responsibilities:** Folder-style organization, search, bulk operations on media the Media module already owns.
- **Dependencies:** Media, Identity & Access.
- **Public Contracts:** Browse, organize (no independent storage — delegates to Media).
- **Events:** None of its own.
- **Data Ownership:** None — organizational metadata only, layered on Media's data.
- **Security Considerations:** Inherits Media's `SECURITY:FILE_UPLOAD` posture entirely.
- **Future Extension Points:** N/A — this is itself a thin UI-layer extension of Media.
- **Complexity:** Low.
- **Acceptance Criteria:** No file ever exists in File Manager without also existing in Media's ownership — `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` holds.

### 9. Installer
**Covers:** #62 Installer
**Phase:** 1 (P0)
**New module.**
- **Purpose:** First-run setup for a self-hosted installation, per `DEPLOYMENT:PHILOSOPHY`'s "deployable without specialized expertise."
- **Responsibilities:** Guided first-run configuration; initial admin account creation; secure-by-default confirmation per `SECURITY:SECURE_CONFIGURATION`.
- **Dependencies:** Platform Foundation, Identity & Access, Store Configuration.
- **Public Contracts:** Installation wizard flow (admin-only, pre-authentication).
- **Events:** `PlatformInstalled`.
- **Data Ownership:** None persistent beyond triggering Identity & Access / Store Configuration writes.
- **Security Considerations:** The installer itself must be disabled or locked after first run — an active installer endpoint is a standing attack surface.
- **Future Extension Points:** A managed/hosted installation path for SaaS, later.
- **Complexity:** Medium.
- **Acceptance Criteria:** A non-technical operator can complete installation using only `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`-level guidance.

### 10. Upgrader
**Covers:** #63 Upgrader
**Phase:** 2
**New module.**
- **Purpose:** Implements `DEPLOYMENT:UPGRADE_STRATEGY` and `DEPLOYMENT:ROLLBACK_PHILOSOPHY` concretely.
- **Responsibilities:** Version detection, migration execution, rollback capability, verification-before-reliance per `DEPLOYMENT:ROLLBACK_PHILOSOPHY`'s strengthened rule.
- **Dependencies:** Platform Foundation, all modules with data migrations.
- **Public Contracts:** Upgrade check, upgrade execute, rollback execute (admin-only).
- **Events:** `UpgradeStarted`, `UpgradeCompleted`, `UpgradeRolledBack`.
- **Data Ownership:** Version/migration state — Operational.
- **Security Considerations:** Full `08_SECURITY_STANDARD` applies to an upgrade mechanism handling privileged operations across every module.
- **Future Extension Points:** Managed/automatic upgrade path for SaaS deployments.
- **Complexity:** Very High.
- **Acceptance Criteria:** Full `DEPLOYMENT:REVIEW_CHECKLIST` pass; rollback demonstrably exercised, not only designed.

---

## Commerce Domain

### 11. Customers
**Covers:** #6 Customers
**Phase:** 1 (P0)
**New module — distinct from Identity & Access's staff/user concept.**
- **Purpose:** Owns customer-facing account data and purchase history relationship, distinct from operator identity.
- **Responsibilities:** Customer registration, profile, address book, order history association.
- **Dependencies:** Identity & Access (authentication mechanism), Orders (history).
- **Public Contracts:** Customer CRUD, address management.
- **Events:** `CustomerRegistered`, `CustomerProfileUpdated`.
- **Data Ownership:** Customer profile and address data — Sensitive per `DATA:CLASSIFICATION`.
- **Security Considerations:** Full `SECURITY:DATA_PROTECTION` for Sensitive classification; customers are the largest data-subject population the platform holds.
- **Future Extension Points:** CRM (Growth domain) consumes Customer events for relationship-building without owning customer identity itself.
- **Complexity:** Medium.
- **Acceptance Criteria:** A customer can export their own data per `DATA:IMPORT_EXPORT`, satisfying `VISION:PLATFORM_PROMISES`.

### 12. Catalog
**Covers:** #9 Catalog, #10 Products, #11 Categories, #12 Brands, #13 Attributes, #14 Variants
**Phase:** 1 (P0)
**Maps to:** `MODULE:CATALOG`
- **Purpose:** Owns product, category, brand, attribute, and variant information — the platform's core sellable-item data.
- **Responsibilities:** Product/variant modeling, category and brand taxonomy, attribute schema.
- **Dependencies:** Media (product images), Platform Foundation.
- **Public Contracts:** Product/category/brand/attribute CRUD, variant management, per `API:RESOURCE_NAMING`.
- **Events:** `ProductCreated`, `ProductUpdated`, `ProductArchived`, `VariantAdded`.
- **Data Ownership:** Products, categories, brands, attributes, variants — the largest single aggregate family in Commerce.
- **Security Considerations:** Bulk import (via `DATA:IMPORT_EXPORT`) is a high-volume write surface requiring `SECURITY:INPUT_VALIDATION` at scale.
- **Future Extension Points:** Multi-vendor readiness (Phase 4) requires Catalog to eventually support a vendor-scoped ownership dimension — noted now, not built now.
- **Complexity:** Very High (largest data model in the platform).
- **Acceptance Criteria:** Search indexing (per `DATA:SEARCH_INDEXING`) is fully rebuildable from Catalog data alone.

### 13. Pricing & Tax
**Covers:** #16 Pricing, #68 Tax
**Phase:** 1 (P0)
**Maps to:** `MODULE:PRICING`
- **Purpose:** Owns base pricing rules and tax calculation, per `MODULE:PRICING`.
- **Responsibilities:** Base price determination; tax rule application by jurisdiction.
- **Dependencies:** Catalog, Localization & Currency.
- **Public Contracts:** Price lookup, tax calculation.
- **Events:** `PriceChanged`.
- **Data Ownership:** Base pricing rules, tax rules — Confidential (business-sensitive margins).
- **Security Considerations:** Price/tax tampering is a direct financial risk — every mutation audited per `SECURITY:AUDIT_LOGGING`.
- **Future Extension Points:** Region-specific tax regimes added without redesign, per the same pattern as Localization.
- **Complexity:** High (tax jurisdiction complexity in particular).
- **Acceptance Criteria:** Pricing and Promotions remain separate modules with Promotions only ever adjusting, never replacing, Pricing's base value — per the layered pattern `04_MODULE_ARCHITECTURE` already established.

### 14. Promotions & Coupons
**Covers:** #17 Promotions, #18 Coupons
**Phase:** 1 (basic) / Phase 3 (advanced engine)
**Maps to:** `MODULE:PROMOTIONS`
- **Purpose:** Discount and coupon rules layered on Pricing.
- **Responsibilities:** Phase 1: percentage/fixed discounts, single coupon codes, usage limits. Phase 3: rule engine, stacking, customer-segment targeting.
- **Dependencies:** Catalog, Pricing.
- **Public Contracts:** Promotion/coupon CRUD, discount calculation at checkout time.
- **Events:** `PromotionApplied`, `CouponRedeemed`.
- **Data Ownership:** Promotion rules, coupon codes, redemption records (per-customer usage tracking).
- **Security Considerations:** Coupon abuse (redemption limit bypass) requires the same rigor as any financial control.
- **Future Extension Points:** Phase 3's advanced engine (stacking, segments, scheduled campaigns) is the designed-for-later capability this module grows into.
- **Complexity:** Medium (Phase 1), Very High (Phase 3).
- **Acceptance Criteria:** Phase 1: coupon redemption tracking prevents double-use per customer, per-code, and by minimum-order rule.

### 15. Inventory & Multi-Warehouse
**Covers:** #19 Inventory, #20 Multi-Warehouse
**Phase:** 1 (single-warehouse) / Phase 2 (multi-warehouse)
**Maps to:** `MODULE:INVENTORY`
- **Purpose:** Owns stock levels and movement, per `MODULE:INVENTORY`.
- **Responsibilities:** Stock tracking, reservation during checkout, movement history.
- **Dependencies:** Catalog.
- **Public Contracts:** Stock level query, reservation, adjustment.
- **Events:** `StockAdjusted`, `StockReserved`, `StockReleased`.
- **Data Ownership:** Stock records, movement history — Operational.
- **Security Considerations:** Stock manipulation is a direct fraud vector — full audit trail per `DATA:AUDIT_DATA`.
- **Future Extension Points:** Multi-warehouse (Phase 2) extends the same aggregate with a location dimension, not a redesign.
- **Complexity:** Medium (Phase 1), High (Phase 2).
- **Acceptance Criteria:** Concurrent checkout reservations never oversell — verified per `DATA:VERSIONING`'s conflict-detection requirement.

### 16. Suppliers, Purchase Orders & Stock Transfer
**Covers:** #21 Suppliers, #22 Purchase Orders, #23 Stock Transfer
**Phase:** 2
**Maps to:** `MODULE:SUPPLIER_MANAGEMENT`
- **Purpose:** Owns supplier records and inbound/inter-warehouse stock movement.
- **Responsibilities:** Supplier CRUD, purchase order lifecycle, stock transfer between warehouses.
- **Dependencies:** Inventory & Multi-Warehouse, Catalog.
- **Public Contracts:** Supplier CRUD, PO lifecycle, transfer request/fulfillment.
- **Events:** `PurchaseOrderCreated`, `PurchaseOrderReceived`, `StockTransferInitiated`, `StockTransferCompleted`.
- **Data Ownership:** Supplier records, purchase orders, transfer records — Confidential (supplier pricing terms).
- **Security Considerations:** Supplier financial terms are Confidential per `DATA:CLASSIFICATION`.
- **Future Extension Points:** Dropshipping (Phase 3) extends this module's supplier relationship into an automated fulfillment path.
- **Complexity:** High.
- **Acceptance Criteria:** A received purchase order updates Inventory atomically within a single aggregate transaction, per `DATA:TRANSACTION_BOUNDARIES`.

### 17. Orders
**Covers:** #24 Orders
**Phase:** 1 (P0)
**Maps to:** `MODULE:ORDERS`
- **Purpose:** Owns the record of what was ordered, at what price, and its status.
- **Responsibilities:** Order creation from Checkout, status lifecycle, order history.
- **Dependencies:** Catalog, Pricing & Tax, Promotions & Coupons, Customers.
- **Public Contracts:** Order CRUD (create via Checkout only), status query.
- **Events:** `OrderPlaced`, `OrderStatusChanged`.
- **Data Ownership:** Order records — Confidential.
- **Security Considerations:** Orders "record the outcome of pricing and promotion decisions" per `04_MODULE_ARCHITECTURE` — never recalculates them independently.
- **Future Extension Points:** Marketplace readiness (Phase 4) requires Orders to eventually support a multi-seller split — noted, not built.
- **Complexity:** High.
- **Acceptance Criteria:** `OrderPlaced` triggers Fulfillment and Inventory reactions via events, never direct calls, per `ARCH:CROSS_DOMAIN_COMMUNICATION`.

### 18. Checkout
**Covers:** #25 Checkout
**Phase:** 1 (P0)
**Maps to:** `MODULE:CHECKOUT`
- **Purpose:** Owns the in-progress purchase flow before it becomes an Order.
- **Responsibilities:** Cart-to-order flow, availability confirmation, price/discount calculation at time of purchase.
- **Dependencies:** Catalog, Inventory, Pricing & Tax, Promotions & Coupons, Orders.
- **Public Contracts:** Checkout session management, order creation trigger.
- **Events:** `CheckoutStarted`, `CheckoutAbandoned`, `CheckoutCompleted`.
- **Data Ownership:** In-progress checkout sessions — Temporary classification per `DATA:CLASSIFICATION`.
- **Security Considerations:** Checkout is the highest-value fraud target on the platform — ties directly to `SECURITY:FRAUD_PROTECTION`.
- **Future Extension Points:** Guest checkout, saved-payment-method checkout are Phase 2 refinements of this same module.
- **Complexity:** Very High (most cross-module dependencies of any Commerce module).
- **Acceptance Criteria:** A checkout session is genuinely Temporary per `DATA:LIFECYCLE` — abandoned sessions do not accumulate indefinitely.

### 19. Payments
**Covers:** #26 Payments
**Phase:** 1 (P0)
**New module.**
- **Purpose:** The integration boundary to external payment processors, per `ARCH:SYSTEM_CONTEXT`.
- **Responsibilities:** Payment charge/refund delegation to external processors; never stores card data itself, per `08_SECURITY_STANDARD` §3.
- **Dependencies:** Orders, Checkout.
- **Public Contracts:** Charge, refund, payment status query.
- **Events:** `PaymentAuthorized`, `PaymentCaptured`, `PaymentFailed`, `PaymentRefunded`.
- **Data Ownership:** Payment references and status — Sensitive, but never raw card data.
- **Security Considerations:** The single highest-severity security boundary in the platform besides Identity & Access — full `SECURITY:SECURITY_BOUNDARIES` external-integration treatment.
- **Future Extension Points:** Additional payment processors added as new adapters without changing Orders or Checkout's contract.
- **Complexity:** Very High.
- **Acceptance Criteria:** No card data ever appears in logs, per `ENGINEERING:LOGGING_PRINCIPLES`; every payment event is audited.

### 20. Reviews
**Covers:** #32 Reviews
**Phase:** 2
**New module.**
- **Purpose:** Customer product feedback.
- **Responsibilities:** Review submission, moderation, display.
- **Dependencies:** Catalog, Customers, Orders (verified-purchase check).
- **Public Contracts:** Review CRUD, moderation actions.
- **Events:** `ReviewSubmitted`, `ReviewModerated`.
- **Data Ownership:** Review content — Internal (public once approved).
- **Security Considerations:** User-generated content requires `SECURITY:OUTPUT_ENCODING` discipline.
- **Future Extension Points:** AI-assisted moderation (Phase 4, AI-only).
- **Complexity:** Low.
- **Acceptance Criteria:** A review cannot be submitted without a verifiable order reference, per anti-fraud intent.

### 21. Wishlist & Compare
**Covers:** #33 Wishlist, #34 Compare
**Phase:** 2
**New module.**
- **Purpose:** Customer-side product list-building for later purchase or comparison.
- **Responsibilities:** Wishlist and comparison-list management.
- **Dependencies:** Catalog, Customers.
- **Public Contracts:** List CRUD.
- **Events:** `WishlistItemAdded`.
- **Data Ownership:** List contents — Internal, customer-scoped.
- **Security Considerations:** Minimal — low-sensitivity data.
- **Future Extension Points:** Marketing (Phase 3) may consume wishlist events for re-engagement campaigns.
- **Complexity:** Low.
- **Acceptance Criteria:** Removing a product from Catalog gracefully degrades wishlist entries rather than erroring.

---

## Operations Domain

### 22. Shipping & Logistics
**Covers:** #27 Shipping, #69 Logistics
**Phase:** 1 (basic shipping) / Phase 3 (logistics depth)
**Maps to:** `MODULE:SHIPPING`
- **Purpose:** Shipping method configuration and rate information, per `MODULE:SHIPPING`.
- **Responsibilities:** Shipping method setup, rate calculation, carrier rate integration.
- **Dependencies:** Orders, Store Configuration.
- **Public Contracts:** Rate query, shipping method configuration.
- **Events:** `ShippingRateCalculated`.
- **Data Ownership:** Shipping method configuration — Internal.
- **Security Considerations:** Carrier integrations are external boundaries per `SECURITY:SECURITY_BOUNDARIES`.
- **Future Extension Points:** Logistics depth (route optimization, multi-carrier arbitration) is Phase 3 growth of this same module.
- **Complexity:** Medium (Phase 1), High (Phase 3).
- **Acceptance Criteria:** A carrier integration failure degrades gracefully per `ENGINEERING:RESILIENCE`, never blocking checkout entirely if an alternative shipping method exists.

### 23. Fulfillment
**Covers:** part of #27 Shipping (fulfillment execution)
**Phase:** 1 (P0)
**Maps to:** `MODULE:FULFILLMENT`
- **Purpose:** Owns the record of what has been picked, packed, and shipped against an order, per `MODULE:FULFILLMENT`.
- **Responsibilities:** Reacts to `OrderPlaced`; tracks fulfillment status; generates labels/tracking via Shipping.
- **Dependencies:** Orders (via event, not direct call), Shipping & Logistics, Inventory.
- **Public Contracts:** Fulfillment status query, manual fulfillment actions.
- **Events:** `FulfillmentStarted`, `FulfillmentCompleted`, `ShipmentDispatched`.
- **Data Ownership:** Fulfillment records — Operational.
- **Security Considerations:** Standard audit requirements; no elevated concern beyond general Operations posture.
- **Future Extension Points:** Dropshipping (Phase 3) is an alternate fulfillment path this module must accommodate without redesign.
- **Complexity:** Medium.
- **Acceptance Criteria:** Fulfillment never depends on Orders' internal data directly — only on the `OrderPlaced` event, per `MODULE:INTERACTION_RULES`.

### 24. Returns, Exchanges & Refunds
**Covers:** #28 Returns, #29 Exchanges, #30 Refunds
**Phase:** 1 (basic) / Phase 2 (exchanges)
**Maps to:** `MODULE:RETURNS`
- **Purpose:** Owns return and exchange requests and their status, per `MODULE:RETURNS`.
- **Responsibilities:** Return request lifecycle, exchange processing, refund coordination with Payments.
- **Dependencies:** Orders (via events), Fulfillment (via events), Payments.
- **Public Contracts:** Return/exchange request, status query.
- **Events:** `ReturnRequested`, `ReturnApproved`, `RefundIssued`.
- **Data Ownership:** Return/exchange records — Confidential.
- **Security Considerations:** Refund fraud is a direct financial risk — full `SECURITY:FRAUD_PROTECTION` applicability.
- **Future Extension Points:** Exchange-specific inventory reservation logic (Phase 2) extends this without redesign.
- **Complexity:** Medium (Returns/Refunds), High (Exchanges — touches Inventory and Orders both).
- **Acceptance Criteria:** A refund never occurs without an associated Payments module transaction reference.

### 25. Dropshipping
**Covers:** #70 Dropshipping
**Phase:** 3
**New module.**
- **Purpose:** Automated supplier-direct fulfillment path, extending Supplier Management.
- **Responsibilities:** Automatic PO generation on order, supplier-direct shipment coordination.
- **Dependencies:** Suppliers/PO/Stock Transfer, Orders, Fulfillment.
- **Public Contracts:** Dropship-eligible product configuration, automated PO triggering.
- **Events:** `DropshipOrderRouted`.
- **Data Ownership:** Dropship routing rules — Internal.
- **Security Considerations:** Supplier-facing data exposure must respect `DATA:CROSS_MODULE_ACCESS` — no direct Inventory write from a supplier-facing surface.
- **Future Extension Points:** Multi-vendor readiness (Phase 4) and Dropshipping share significant conceptual overlap — designed to converge without conflict.
- **Complexity:** High.
- **Acceptance Criteria:** A dropship order's fulfillment failure at the supplier is surfaced to the operator explicitly, per `PRINCIPLES:EXPLICIT_FAILURE`.

---

## Growth Domain

### 26. CRM
**Covers:** #31 CRM
**Phase:** 2 (basic) / Phase 3 (advanced)
**Maps to:** `MODULE:CRM`
- **Purpose:** Customer relationship insight, consuming Commerce/Operations events.
- **Responsibilities:** Customer interaction history, segmentation.
- **Dependencies:** Consumes events from Customers, Orders, Returns — never depended upon by them, per `ARCH:DOMAIN_MAP`.
- **Public Contracts:** Segment query, interaction history.
- **Events:** Consumes only; publishes `CustomerSegmentUpdated` for Marketing's use.
- **Data Ownership:** Derived customer insight — Confidential.
- **Security Considerations:** Aggregated customer insight is itself Sensitive-adjacent even if built from less-sensitive individual events.
- **Future Extension Points:** AI-assisted segmentation (Phase 4, AI-only).
- **Complexity:** Medium (Phase 2), High (Phase 3).
- **Acceptance Criteria:** CRM is never depended upon by any Commerce or Operations module, per `04_MODULE_ARCHITECTURE`'s Growth-domain rule.

### 27. Marketing & Automation
**Covers:** #55 Automation Readiness (marketing-adjacent), general marketing capability
**Phase:** 3
**Maps to:** `MODULE:MARKETING`, `MODULE:AUTOMATION`
- **Purpose:** Campaign and automated-workflow capability built on CRM and Notifications.
- **Responsibilities:** Campaign definition, triggered automation (e.g., abandoned-checkout follow-up).
- **Dependencies:** CRM, Notifications, Checkout (via events).
- **Public Contracts:** Campaign CRUD, automation rule configuration.
- **Events:** `CampaignTriggered`.
- **Data Ownership:** Campaign definitions, automation rules — Internal.
- **Security Considerations:** Automation triggering external communication must respect `SECURITY:RATE_LIMITING_ABUSE`-equivalent throttling to avoid spamming customers.
- **Future Extension Points:** AI-generated campaign content (Phase 4, AI-only).
- **Complexity:** High.
- **Acceptance Criteria:** An automation rule's trigger-to-action path is fully traceable via `API:CORRELATION`-equivalent tracing.

### 28. Analytics, Dashboards & Reports
**Covers:** #39 Analytics, #40 Dashboards, #41 Reports
**Phase:** 1 (basic reporting) / Phase 2 (dashboards) / Phase 3 (advanced analytics)
**Maps to:** `MODULE:REPORTING`
- **Purpose:** Derived, read-optimized views over Commerce and Operations data, per `DATA:SEARCH_INDEXING`'s "derived, never a source of truth" principle applied to reporting.
- **Responsibilities:** Aggregate reporting, dashboard views, exportable reports.
- **Dependencies:** Consumes events from every domain; never depended upon by them.
- **Public Contracts:** Report query, dashboard data query, export.
- **Events:** Consumes only.
- **Data Ownership:** Derived aggregates — never authoritative, per `DATA:SEARCH_INDEXING`'s rule extended to reporting.
- **Security Considerations:** Reports must respect the `DATA:CLASSIFICATION` of underlying data even after aggregation.
- **Future Extension Points:** AI-generated insight/forecasting (Phase 4, AI-only).
- **Complexity:** Medium (Phase 1), High (Phase 3).
- **Acceptance Criteria:** Every report is fully rebuildable from source-of-truth module data, with no independent write path.

---

## Content & Discovery

### 29. Search
**Covers:** #42 Search
**Phase:** 1 (basic) / Phase 2 (advanced)
**New module.**
- **Purpose:** Cross-Catalog (and later cross-CMS) search, implementing `DATA:SEARCH_INDEXING`'s principles concretely.
- **Responsibilities:** Index maintenance, query handling, relevance ranking.
- **Dependencies:** Catalog (primary), CMS/Blog (Phase 2).
- **Public Contracts:** Search query.
- **Events:** Consumes `ProductCreated`/`ProductUpdated` to keep its index current.
- **Data Ownership:** Search index only — a derived view, never authoritative, per `DATA:SEARCH_INDEXING`.
- **Security Considerations:** Search must not surface data a caller lacks permission to see (e.g., unpublished products).
- **Future Extension Points:** AI-assisted semantic search (Phase 4, AI-only).
- **Complexity:** Medium (Phase 1), High (Phase 2, relevance tuning).
- **Acceptance Criteria:** The search index can be fully rebuilt from Catalog (and later CMS) data alone with zero information loss.

### 30. SEO
**Covers:** #43 SEO
**Phase:** 2
**New module.**
- **Purpose:** Search-engine metadata management across storefront content.
- **Responsibilities:** Meta tag configuration, sitemap generation, structured data.
- **Dependencies:** Catalog, CMS & Landing Page Builder, Blog.
- **Public Contracts:** SEO metadata CRUD per content item.
- **Events:** None significant.
- **Data Ownership:** SEO metadata — Public (it's meant to be crawled).
- **Security Considerations:** Minimal.
- **Future Extension Points:** AI-generated meta descriptions (Phase 4, AI-only).
- **Complexity:** Low.
- **Acceptance Criteria:** Every Catalog and CMS entity has an SEO metadata surface, none mandatory to fill in, per `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`.

### 31. CMS & Landing Page Builder
**Covers:** #44 CMS, #45 Landing Page Builder
**Phase:** 2
**New module.**
- **Purpose:** Non-catalog content management and merchant-configurable landing pages.
- **Responsibilities:** Page content CRUD, landing-page composition from `UI:COMPONENTS`' vocabulary.
- **Dependencies:** Media, SEO, Theme System.
- **Public Contracts:** Page CRUD, publish/unpublish.
- **Events:** `Pagepublished`.
- **Data Ownership:** CMS content — Public once published, Internal in draft.
- **Security Considerations:** `SECURITY:OUTPUT_ENCODING` is critical here — merchant-authored content rendered to every storefront visitor.
- **Future Extension Points:** AI-assisted page generation (Phase 4, AI-only).
- **Complexity:** High (the builder itself, if it composes `UI:COMPONENTS` dynamically, is nontrivial).
- **Acceptance Criteria:** A landing page is composed only from the design system's published component vocabulary, per `UI:COMPONENTS`.

### 32. Blog
**Covers:** #46 Blog
**Phase:** 2
**New module — thin extension of CMS.**
- **Purpose:** Blog-specific content type (chronological, categorized) on top of CMS.
- **Responsibilities:** Post CRUD, categorization, publishing schedule.
- **Dependencies:** CMS & Landing Page Builder, SEO, Search.
- **Public Contracts:** Post CRUD.
- **Events:** `PostPublished`.
- **Data Ownership:** Blog posts — Public once published.
- **Security Considerations:** Same as CMS.
- **Future Extension Points:** AI-assisted drafting (Phase 4, AI-only).
- **Complexity:** Low.
- **Acceptance Criteria:** Blog content is indexed by Search per the same rule as Catalog content.

---

## Communication

### 33. Notifications, Email, SMS & WhatsApp
**Covers:** #35 Notifications, #36 Email, #37 SMS, #38 WhatsApp
**Phase:** 1 (Notifications + Email) / Phase 2 (SMS, WhatsApp)
**New module.**
- **Purpose:** The platform's single outbound-communication surface, per `ARCH:SYSTEM_CONTEXT`'s "email/notification providers" external boundary.
- **Responsibilities:** Template management, channel delivery (email Phase 1; SMS/WhatsApp Phase 2), delivery status tracking.
- **Dependencies:** Every module that needs to notify a customer or operator triggers this module via events — it never reaches into their data directly.
- **Public Contracts:** Send notification (internal, event-triggered), template CRUD.
- **Events:** Consumes broadly (`OrderPlaced`, `ReturnApproved`, etc.); publishes `NotificationSent`, `NotificationFailed`.
- **Data Ownership:** Templates, delivery logs — Internal.
- **Security Considerations:** External channel integrations are `SECURITY:SECURITY_BOUNDARIES` external-integration boundaries; delivery failures must be explicit per `PRINCIPLES:EXPLICIT_FAILURE`.
- **Future Extension Points:** Additional channels added as new adapters without changing the triggering modules' contracts.
- **Complexity:** Medium (Email), High (SMS/WhatsApp — external provider integration complexity).
- **Acceptance Criteria:** A notification failure never silently disappears — it is logged, retryable, and surfaced per `SECURITY:MONITORING`.

---

## Platform Interfaces

### 34. Webhooks & Integrations
**Covers:** #49 Webhooks, #50 Integrations
**Phase:** 2
**New module.**
- **Purpose:** Outbound event delivery to third parties and a registry for inbound third-party integrations, extending `06_API_STANDARD`'s API surface outward.
- **Responsibilities:** Webhook subscription management, delivery with retry, third-party integration credential management (via `SECURITY:SECRETS_MANAGEMENT`).
- **Dependencies:** Platform Foundation (event bus) — webhooks are effectively external subscribers to the same event bus internal modules use.
- **Public Contracts:** Webhook subscription CRUD, delivery status query.
- **Events:** Republishes internal domain events externally, filtered per subscriber permission.
- **Data Ownership:** Webhook subscriptions, delivery logs — Internal; third-party credentials — Sensitive.
- **Security Considerations:** This is functionally `SECURITY:SECURITY_BOUNDARIES`'s external-integration boundary made generic and self-service.
- **Future Extension Points:** This module is itself the mechanism that makes `VISION:NON_GOALS`'s anti-lock-in commitment real for third-party developers.
- **Complexity:** High.
- **Acceptance Criteria:** A webhook delivery failure retries per a defined policy and is never silently dropped, per `PRINCIPLES:EXPLICIT_FAILURE`.

**Note:** Item #48 (API) is not a separate module — it is `06_API_STANDARD` itself, already fully specified. No new module is created for it.

---

## Cross-Cutting Programs (Already Specified — No New Module Required)

**Covers:** #56 Fraud Protection, #57 Security, #58 Audit, #59 Monitoring, #60 Backup, #61 Deployment

These six items are **not new modules** — each is already fully specified as a cross-cutting standard, not a bounded-context module with its own data ownership:

- **#56 Fraud Protection** → `SECURITY:FRAUD_PROTECTION` (08). Implementation work: wiring fraud-relevant signals from Checkout, Orders, and Payments into whatever detection logic is built — a Phase 3 activation, not a new module.
- **#57 Security** → the whole of `08_SECURITY_STANDARD`, applied to every module above via each one's Security Considerations field.
- **#58 Audit** → `DATA:AUDIT_DATA` (05) and `SECURITY:AUDIT_LOGGING` (08), implemented per-module, not centrally.
- **#59 Monitoring** → `SECURITY:MONITORING` (08) and `ENGINEERING:OBSERVABILITY` (09), implemented per-module.
- **#60 Backup** → `SECURITY:BACKUP_RECOVERY` (08) and `DEPLOYMENT:BACKUP_VERIFICATION` (11).
- **#61 Deployment** → the whole of `11_DEPLOYMENT_STANDARD`.

Treating these as modules would duplicate what `05`, `08`, `09`, and `11` already fully own — doing so would itself violate `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`.

---

## Phase 4 — Future & Optional Capability

### 35. Marketplace Readiness
**Covers:** #51 Marketplace Readiness
**Phase:** 4 — Optional/Enterprise
- **Purpose:** Multi-seller commerce on a single storefront.
- **Responsibilities:** Seller onboarding, order-splitting across sellers, seller-scoped Catalog ownership.
- **Dependencies:** Catalog, Orders, Payments (split settlement), Suppliers-adjacent seller model.
- **Public Contracts:** Not yet defined — requires its own architecture pass before implementation.
- **Events:** Not yet defined.
- **Data Ownership:** Requires Catalog and Orders to gain a seller-scoping dimension — a genuine extension of existing aggregates, not a new domain.
- **Security Considerations:** Multi-seller data isolation is materially similar to the multi-tenant boundary already designed into `DATA:OWNERSHIP` — likely reuses that mechanism.
- **Future Extension Points:** This module and Multi-Vendor Readiness overlap substantially and should be designed together.
- **Complexity:** Very High.
- **Acceptance Criteria:** Not defined at this planning stage — requires a dedicated architecture pass before Phase 4 begins.

### 36. Multi-Vendor Readiness
**Covers:** #52 Multi-Vendor Readiness
**Phase:** 4 — Optional/Enterprise
- **Purpose:** Vendor-scoped inventory and fulfillment, distinct from full Marketplace (single-seller-of-record, multi-supplier fulfillment).
- **Dependencies:** Suppliers/PO/Stock Transfer, Dropshipping.
- **Complexity:** High.
- **Acceptance Criteria:** Not defined at this planning stage.

### 37. SaaS Readiness
**Covers:** #53 SaaS Readiness
**Phase:** 4 — SaaS-only
- **Purpose:** Activating the tenant boundary `ARCH:DATA_OWNERSHIP` and `ARCH_PLAN:RESOLVED_DECISIONS` item 1 designed in from day one.
- **Responsibilities:** Tenant provisioning, tenant-scoped billing, tenant isolation enforcement at the data layer.
- **Dependencies:** Every module — this is activation of an already-present design, not new module boundaries.
- **Security Considerations:** Tenant isolation failure is the single highest-severity risk this capability introduces — requires its own dedicated security review beyond `08_SECURITY_STANDARD`'s general coverage.
- **Complexity:** Very High.
- **Acceptance Criteria:** Not defined at this planning stage — this is the single largest piece of future work in the entire roadmap and warrants its own planning document when Phase 4 begins.

### 38. AI Readiness, Future AI Modules & ERP Readiness
**Covers:** #54 AI Readiness, #72 Future AI Modules, #71 ERP Readiness
**Phase:** 4 — AI-only / Enterprise
- **Purpose:** A defined integration surface for AI-assisted capability (search, content generation, fraud scoring, forecasting) and ERP-adjacent capability (advanced accounting, multi-entity finance).
- **Responsibilities:** Not yet defined — every AI-only extension point noted throughout this plan (Reviews moderation, CRM segmentation, Marketing content, Search, SEO, CMS, Blog, Reporting) converges here.
- **Dependencies:** Extension System (AI capability is architecturally an extension, not a core module, per `VISION:NON_GOALS`'s rejection of unrestricted core modification).
- **Security Considerations:** Any AI capability with access to Customer or Order data must respect `DATA:CLASSIFICATION` exactly as any other consumer would — no exemption for being AI-driven.
- **Complexity:** Unknown — genuinely future work.
- **Acceptance Criteria:** Not defined at this planning stage.

---

# Part 3 — Dependency Diagram

See `planning/diagrams/module-dependency-diagram.md` for the phase-level module dependency graph. In summary: Platform Foundation and Identity & Access underlie everything; Catalog is the single most-depended-upon Commerce module; Orders is the pivot point between Commerce and Operations, reached only through Checkout and reacted to only through events, never direct calls, per `ARCH:CROSS_DOMAIN_COMMUNICATION`.

---

# Part 4 — Implementation Order, Milestones, Sprints, and Releases

## Implementation Order (Phase 1)

Strict build order for Phase 1, respecting the dependency graph above:

1. Platform Foundation
2. Identity & Access
3. Organizations & Stores
4. Media
5. Localization & Currency (basic)
6. Installer
7. Customers
8. Catalog
9. Pricing & Tax (basic)
10. Promotions & Coupons (basic)
11. Inventory & Multi-Warehouse (single-warehouse)
12. Checkout
13. Orders
14. Payments
15. Shipping & Logistics (basic)
16. Fulfillment
17. Returns, Exchanges & Refunds (basic)
18. Notifications & Email (basic)
19. Search (basic)
20. Hardening pass: full `SECURITY:REVIEW_CHECKLIST`, `TESTING:REVIEW_CHECKLIST`, and `DEPLOYMENT:REVIEW_CHECKLIST` across everything above

## Sprint Grouping (Phase 1, illustrative)

Sprint length and count are an implementation-team decision, not fixed here — this grouping shows logical batching only:

- **Sprint Group A — Foundation:** Platform Foundation, Identity & Access, Organizations & Stores, Installer.
- **Sprint Group B — Catalog & Content Base:** Media, Localization & Currency, Catalog.
- **Sprint Group C — Commerce Core:** Pricing & Tax, Promotions & Coupons, Inventory, Customers.
- **Sprint Group D — Transaction Path:** Checkout, Orders, Payments — the most cross-dependent group; do not parallelize across teams without careful contract-testing discipline, per `TESTING:CONTRACT_TESTING`.
- **Sprint Group E — Fulfillment Path:** Shipping & Logistics, Fulfillment, Returns/Exchanges/Refunds.
- **Sprint Group F — Launch Readiness:** Notifications & Email, Search, and the full hardening pass — `DEPLOYMENT:GO_LIVE_CHECKLIST` gates the end of this group.

## Milestone Roadmap

- **Milestone 1 — Foundation Complete:** Sprint Groups A–B done. The platform runs, an operator can log in, a product can be created.
- **Milestone 2 — Commerce Core Complete:** Sprint Group C done. Pricing, promotions, and inventory are fully operational.
- **Milestone 3 — Transaction-Capable:** Sprint Group D done. A real order can be placed and paid for end to end.
- **Milestone 4 — Operationally Complete:** Sprint Group E done. Orders can be fulfilled, shipped, and returned.
- **Milestone 5 — v1.0 Release-Ready:** Sprint Group F done, `DEPLOYMENT:GO_LIVE_CHECKLIST` passed in full.

## Release Roadmap

### Phase 1 — Version 1.0 (Mandatory Production Baseline)
Modules 1–19 above, at their Phase 1 scope. Self-hosted, single-store, single-tenant, single-warehouse. This is the release `VISION:SUCCESS_DEFINITION` is measured against.

### Phase 2 — Version 1.1 (Operational Depth)
Multi-Warehouse (full), Suppliers/PO/Stock Transfer, Theme System, Extension System, File Manager, Upgrader, SMS & WhatsApp, Reviews, Wishlist & Compare, Search (advanced), SEO, CMS & Landing Page Builder, Blog, Webhooks & Integrations, CRM (basic), Dashboards, localization/currency (full).

**Mandatory for v1.1:** Upgrader (a platform that shipped v1.0 must be able to upgrade to v1.1 — this is not optional). Extension System (the first real test of `MODULE:EXTENSIBILITY_MECHANISM`).
**Optional/deferred within v1.1 if needed:** Blog, SEO can slip to v1.2 without blocking the release if schedule pressure requires a cut line — everything else in this phase is materially load-bearing for "operational depth" as a release theme.

### Phase 3 — Version 1.2 (Growth & Scale)
Marketing & Automation, Promotions & Coupons (advanced engine), Dropshipping, Shipping & Logistics (depth), CRM (advanced), Analytics (advanced), Fraud Protection (activated).

**Enterprise-only within v1.2:** None yet — this phase is still core growth capability available to every merchant, not gated.

### Phase 4 — Version 2.0 (Platform Expansion)
Marketplace Readiness, Multi-Vendor Readiness, SaaS Readiness, AI Readiness & Future AI Modules, ERP Readiness.

**Explicitly gated by capability tier:**
- **Optional/Enterprise:** Marketplace Readiness, Multi-Vendor Readiness, ERP Readiness — available to any self-hosted merchant who needs them, not architecturally exclusive to a hosting model.
- **SaaS-only:** SaaS Readiness — by definition, this only matters for a managed/hosted deployment; a self-hosted single-tenant merchant never activates it, consistent with `VISION:NON_GOALS`'s rejection of mandatory vendor-hosted infrastructure.
- **AI-only:** AI Readiness & Future AI Modules — gated behind the Extension System, per `VISION:NON_GOALS`'s rejection of unrestricted core modification; AI capability is additive, never load-bearing for core commerce operation.

Version 2.0 is deliberately the release where every deferred item from `01_PRODUCT_VISION`'s original Non-Goals gets revisited on its own terms — not violated, revisited, exactly as that document anticipated.

---

# Closing Note

Every module above traces to a decision already made in `00`–`11`. Where this plan proposes a genuinely new module (Payments, Customers, Theme System, Extension System, Localization & Currency, File Manager, Installer, Upgrader, Dropshipping, Reviews, Wishlist & Compare, Search, SEO, CMS & Landing Page Builder, Blog, Notifications/Email/SMS/WhatsApp, Webhooks & Integrations), that module still must be formally added to `04_MODULE_ARCHITECTURE` — with its own ownership, dependency, and coupling rules stated there — before implementation begins, per `MODULE:AUTHORITY`. This plan sequences and scopes the work; it does not substitute for that formal addition.

No code has been written. No implementation has begun.

---

End of Document


