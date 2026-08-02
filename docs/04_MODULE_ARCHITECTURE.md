# neXgen Core
## 04_MODULE_ARCHITECTURE

| Field | Value |
|---|---|
| **Title** | Module Architecture |
| **Document ID** | MODULE |
| **Version** | 1.1 |
| **Status** | Accepted |
| **Author** | Chief Software Architect & Lead Engineer (independently reviewed and approved by Product & Solution Architect) |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | 03_SYSTEM_ARCHITECTURE |
| **Related Documents** | 00_PROJECT_GOVERNANCE, 01_PRODUCT_VISION, 02_PRODUCT_PRINCIPLES |
| **Applies To** | Every database, API, UI, security, engineering, testing, and deployment decision made downstream in `05_DATA_ARCHITECTURE.md` onward |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-01 | Initial draft | First Module Architecture draft, deriving its module list directly from the domain responsibilities already stated in `03_SYSTEM_ARCHITECTURE` `ARCH:DOMAIN_MAP` |
| 1.0 | 2026-08-01 | Added `MODULE:STABILITY` (§8) — Core/Stable/Evolvable/Experimental classification for every module, governing how freely each module's public contract may change — and `MODULE:PUBLIC_CONTRACT` (§9) — every module exposes only a public contract, other modules may depend only on that contract and never on internal implementation, internal implementation may change freely as long as the contract stays compatible. Fixed a stale raw section-number cross-reference introduced by the insertion (§4 Extensibility, now points to `MODULE:EXTENSIBILITY_MECHANISM`). Renumbered §§8–11 to §§10–13 accordingly. Status changed to Accepted following independent review by the Product & Solution Architect and Product Owner approval | Independent review requested these two additions; no other architectural changes were made |
| 1.1 | 2026-08-01 | Renamed all references from `05_DATABASE_ARCHITECTURE.md` to `05_DATA_ARCHITECTURE.md` (4 occurrences) — no content change | Downstream document renamed by Product Owner decision; cross-references must stay valid per the project's documentation rules |

---

# 1. Purpose

**Identifier: MODULE:PURPOSE**

`03_SYSTEM_ARCHITECTURE` established four domains and, within each domain's description, named the responsibilities that domain covers. This document turns those named responsibilities into actual modules: each with a defined boundary, a single owning domain, a stated set of data it owns, and explicit rules for what it may and may not depend on.

This document also resolves the one item `03_SYSTEM_ARCHITECTURE` (`ARCH:EXTENSIBILITY_MODEL`) deliberately deferred: the concrete shape of the extensibility mechanism, now that module boundaries make it possible to state precisely.

---

# 2. Scope

**Identifier: MODULE:SCOPE**

This document defines module boundaries, responsibilities, data ownership, dependencies, and interaction rules — at the level of "what exists and what may talk to what," not "how it is built." Per `GOVERNANCE:TECHNOLOGY_LEAKAGE`, this document is Mostly Technology Independent: it may describe structural concepts (a module registering for events, an extension's lifecycle) but must not name a specific technology to do so.

This document does **not** define: database tables, columns, or schema (`05_DATA_ARCHITECTURE.md`); API endpoints or contracts (`06_API_STANDARD.md`); UI structure (`07_UI_DESIGN_SYSTEM.md`); or any implementation detail or code. A drafter who finds themselves naming a table, an endpoint, or a class while writing this document has drifted out of scope, consistent with the discipline `03_SYSTEM_ARCHITECTURE_PLAN` established for its own document.

---

# 3. Module Definition and Ownership Rule

**Identifier: MODULE:DEFINITION**

A module is the smallest unit of domain responsibility with its own clear boundary, named in this document. Every module belongs to exactly one domain (`ARCH:DOMAIN_MAP`). Every module owns exactly one category of data, and no other module — regardless of domain — may access that data except through the owning module, directly satisfying `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` and `ARCH:DATA_OWNERSHIP` at module granularity rather than only domain granularity.

Consistent with `ARCH:DATA_OWNERSHIP`, every module's owned data is designed with an implicit tenant boundary from Phase 1 onward, unexercised until multi-tenancy is actually built. Modules and `05_DATA_ARCHITECTURE.md` should treat this as already decided, not as a question to reopen.

---

# 4. Platform Domain Modules

**Identifier: MODULE:PLATFORM**

- **Identity & Access** (`MODULE:IDENTITY_ACCESS`) — owns users, roles, permissions, and authentication state. Every other module that needs to know "who is doing this and are they allowed to" depends on this module.
- **Store Configuration** (`MODULE:STORE_CONFIGURATION`) — owns store-level business information (store identity, currency, locale, operating parameters).
- **Settings** (`MODULE:SETTINGS`) — owns general platform configuration not specific to store identity (feature toggles, module-level configuration values other modules read).
- **Media** (`MODULE:MEDIA`) — owns uploaded assets (images and other files) referenced by other modules; other modules reference media by identifier, never by direct storage access.
- **Extensibility** (`MODULE:EXTENSIBILITY`) — owns the extension registry and lifecycle. Detailed in `MODULE:EXTENSIBILITY_MECHANISM` below.

Every module in every other domain may depend directly on any Platform module. No Platform module may depend on a module outside Platform — Platform is depended upon, and depends on nothing, consistent with `ARCH:DOMAIN_MAP` ("Platform underlies Commerce, Operations, and Growth").

---

# 5. Commerce Domain Modules

**Identifier: MODULE:COMMERCE**

- **Catalog** (`MODULE:CATALOG`) — owns product, category, and brand information.
- **Inventory** (`MODULE:INVENTORY`) — owns stock levels and stock movement records. Depends on Catalog to know what a stock record refers to, but Catalog does not depend on Inventory — a product can exist in the Catalog without Inventory ever having tracked stock for it.
- **Pricing** (`MODULE:PRICING`) — owns base pricing rules. Depends on Catalog.
- **Promotions** (`MODULE:PROMOTIONS`) — owns discount and promotional rules. Depends on Catalog and Pricing; adjusts the price Pricing establishes, per the pattern already used for updater-style layered decision-making elsewhere in this project — Pricing determines the base price, Promotions may adjust it, and the two are never merged into one module, so that promotional logic can evolve without touching base pricing logic.
- **Orders** (`MODULE:ORDERS`) — owns the record of what was ordered, at what price, and its status. Depends on Catalog (what was ordered), Pricing and Promotions (what it cost), and Identity & Access (who ordered it). Orders records the outcome of pricing and promotion decisions — it does not itself decide prices or apply discounts, consistent with keeping data ownership single-purpose per `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`.
- **Checkout** (`MODULE:CHECKOUT`) — owns the in-progress purchase flow before it becomes a completed Order. Depends on Catalog, Inventory (to confirm availability), Pricing, Promotions, and Orders (to create the order once checkout completes).

Within Commerce, direct module-to-module calls are permitted along the dependencies stated above. No Commerce module may depend on an Operations or Growth module.

---

# 6. Operations Domain Modules

**Identifier: MODULE:OPERATIONS**

- **Shipping** (`MODULE:SHIPPING`) — owns shipping method configuration and rate information.
- **Fulfillment** (`MODULE:FULFILLMENT`) — owns the record of what has been picked, packed, and shipped against an order. Reacts to an "OrderPlaced" event from Commerce (`ARCH:CROSS_DOMAIN_COMMUNICATION`) rather than depending on the Orders module directly.
- **Returns** (`MODULE:RETURNS`) — owns return and exchange requests and their status. Reacts to Fulfillment and Order-related events; does not directly depend on Commerce modules.
- **Supplier Management** (`MODULE:SUPPLIER_MANAGEMENT`) — owns supplier records and supplier-facing operational data.

Within Operations, direct module-to-module calls are permitted (e.g. Returns may call Fulfillment directly, both within Operations). No Operations module may depend on a Commerce or Growth module directly — any information Operations needs from Commerce arrives as an event, per `ARCH:CROSS_DOMAIN_COMMUNICATION`.

---

# 7. Growth Domain Modules

**Identifier: MODULE:GROWTH**

- **Reporting** (`MODULE:REPORTING`)
- **CRM** (`MODULE:CRM`)
- **Marketing** (`MODULE:MARKETING`)
- **Automation** (`MODULE:AUTOMATION`)

Consistent with `ARCH:DOMAIN_MAP`, Growth modules are designed for, not built in, Phase 1 — this section defines their boundary and ownership so future implementation has somewhere correct to attach, without requiring any of them to be built now. All four consume events from Commerce and Operations for insight; none of them may be depended upon by any Commerce, Operations, or Platform module. A Commerce or Operations module that finds itself needing something from a Growth module has violated this document's boundary, not found a legitimate exception to it.

---

# 8. Module Stability Classification

**Identifier: MODULE:STABILITY**

Every module named in §§4–7 is assigned exactly one of the following stability classifications. The classification governs how freely that module's public contract (`MODULE:PUBLIC_CONTRACT`) may change, not how good or important the module is.

- **Core.** Foundational to the platform's operation; other modules depend on it extensively, often across domain boundaries via events. A breaking change to a Core module's public contract requires the full `GOVERNANCE:CHANGE_MANAGEMENT` process and an ADR, and should be treated as a last resort. `Identity & Access` and `Store Configuration` are Core.
- **Stable.** Depended upon by other modules and expected to change slowly. A breaking change is permitted but must be proposed, justified, and go through ordinary document/ADR review before being made — it is not a routine event. `Catalog`, `Inventory`, `Orders`, `Media`, and `Settings` are Stable.
- **Evolvable.** Expected to change as the platform's understanding of its own domain matures. Breaking changes to an Evolvable module's public contract are permitted through the normal review cycle without requiring the elevated justification a Core or Stable change would need. `Pricing`, `Promotions`, `Checkout`, `Shipping`, `Fulfillment`, `Returns`, and `Supplier Management` are Evolvable.
- **Experimental.** Not yet built in Phase 1, or built but not yet proven in real use. An Experimental module's public contract may change without the same review overhead the other three classifications require, since no other module should yet be depending on it in a way that a change would be costly to break. `Reporting`, `CRM`, `Marketing`, `Automation`, and `Extensibility` are Experimental — Extensibility is classified Experimental specifically because its concrete mechanism (`MODULE:EXTENSIBILITY_MECHANISM`) is newly defined in this document and not yet exercised by any real extension.

A module's classification is not permanent. As a module proves itself in real use, its classification should be proposed to move (e.g. Experimental → Evolvable, Evolvable → Stable) through the same change process as any other document change — this document does not pre-decide when that happens, only what each classification means once assigned.

---

# 9. Module Public Contracts

**Identifier: MODULE:PUBLIC_CONTRACT**

Every module exposes only a **public contract** — the set of capabilities, events, and configuration surfaces it deliberately makes available to other modules. Everything else about how a module works internally is private to that module.

- A module may depend only on another module's published public contract — never on that module's internal implementation, however that implementation happens to work at a given point in time.
- A module must never depend on another module's internal implementation, even indirectly (for example, by relying on a side effect of how another module happens to be built rather than on something that module has explicitly published as part of its contract).
- A module's internal implementation may change freely — including substantial rework — without being considered a breaking change to the platform, as long as its public contract remains compatible. Whether such a change requires review at all is governed by `MODULE:STABILITY`; whether it is considered *breaking* is governed by this section.

This is the module-level mechanism that makes `MODULE:STABILITY`'s classifications meaningful: a Core module can still be actively worked on and improved internally without triggering the elevated review its classification implies, as long as nothing it has published as its public contract changes incompatibly. It is also the mechanism that makes `ARCH:CROSS_DOMAIN_COMMUNICATION`'s event-based cross-domain interaction enforceable in practice — an event a module publishes is part of its public contract; the internal logic that decides when to publish it is not.

---

# 10. Cross-Module Interaction Rules

**Identifier: MODULE:INTERACTION_RULES**

- **Within the same domain:** direct calls between modules are permitted, along the specific dependencies stated in §§4–7 above. A module may not call another module in its own domain that is not listed as a dependency.
- **Across domains:** interaction happens only through the domain event bus (`ARCH:CROSS_DOMAIN_COMMUNICATION`). A module never calls, queries, or writes to a module in a different domain directly, regardless of what that domain is.
- **Into Platform:** any module, in any domain, may depend on any Platform module directly. This is the one exception to the "same domain only" rule for direct calls, since Platform is architecturally positioned to underlie everything (`ARCH:DOMAIN_MAP`).
- **Out of Platform:** no Platform module may depend on any module outside Platform, directly or via events.

See the Module Dependency Map: `docs/diagrams/module-dependency-map.md`.

---

# 11. Allowed and Forbidden Coupling

**Identifier: MODULE:COUPLING_RULES**

**Allowed:**
- A module depending directly on another module in the same domain, where that dependency is explicitly stated in §§4–7.
- Any module depending directly on any Platform module.
- A module reacting to an event published by a module in a different domain.
- An extension (`MODULE:EXTENSIBILITY`) subscribing to events published by any module.

**Forbidden:**
- Any module accessing another module's owned data directly, bypassing the owning module — regardless of whether the two modules are in the same domain.
- Any module depending directly (not via event) on a module in a different domain.
- Any Commerce, Operations, or Growth module being depended upon by a Platform module.
- Any Commerce or Operations module depending on a Growth module, directly or via event subscription in the reverse direction (Growth may subscribe to their events; they may never subscribe to or depend on Growth's).
- A circular dependency between two modules in the same domain (e.g. Catalog depending on Inventory while Inventory depends on Catalog) — dependencies within a domain must form a one-directional chain, not a cycle, so that no module's behavior is defined in terms of another module that is itself waiting on it.
- An extension modifying, patching, or forking a core module's internal logic to gain a capability that module does not expose through its defined interaction surface — the correct path is a documented enhancement request against that module, not a workaround through the extension mechanism.

---

# 12. Extensibility Mechanism

**Identifier: MODULE:EXTENSIBILITY_MECHANISM**

This section resolves what `ARCH:EXTENSIBILITY_MODEL` deliberately left for this document to decide.

An extension is a unit of capability that attaches to the platform without modifying any core module's internal logic. Concretely, at the architecture level (not implementation):

- **Registration.** An extension registers itself with the `MODULE:EXTENSIBILITY` module, declaring what it needs: which events it wants to observe, and which configuration surface (if any) it adds.
- **Lifecycle.** An extension has three states: registered, active, and inactive. Only an active extension receives events or has its configuration surface exposed. Deactivating an extension must not corrupt or lose the core data any module owns — an extension may add data of its own, but it may never become load-bearing for a core module's own correctness (this is the module-level enforcement of `VISION:PLATFORM_PROMISES`'s "extensions do not require modifying the core").
- **Surface.** An extension may only interact with the rest of the platform through two channels: subscribing to domain events (read access to what happened, never write access to another module's data), and adding configuration that a module already supports extending (per `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`) — never through a channel a module has not explicitly exposed for that purpose.

This is an architectural description of the mechanism's shape, not its implementation — how registration is technically performed, how the lifecycle is technically enforced, and how the event subscription technically works are `09_ENGINEERING_STANDARD.md` and eventual code-level concerns, not this document's.

---

# 13. Relationship to Other Documents

**Identifier: MODULE:AUTHORITY**

This document is subordinate to `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, `02_PRODUCT_PRINCIPLES`, and `03_SYSTEM_ARCHITECTURE`. Every module boundary and coupling rule above must be traceable to a domain and responsibility already established in `ARCH:DOMAIN_MAP`, or to a principle or promise in `01_PRODUCT_VISION` / `02_PRODUCT_PRINCIPLES` — this document does not introduce new domains or redraw domain boundaries; it only resolves what exists within them.

`05_DATA_ARCHITECTURE.md` and every document after it must be consistent with the module boundaries defined here. If a lower-level document is found to require violating one of these boundaries, the lower-level document is revised, or this document is revised through `GOVERNANCE:CHANGE_MANAGEMENT` — this document is not silently reinterpreted to accommodate a downstream conflict.

---

End of Document
