# neXgen Core
## 05_DATA_ARCHITECTURE

| Field | Value |
|---|---|
| **Title** | Data Architecture |
| **Document ID** | DATA |
| **Version** | 1.0 |
| **Status** | Accepted |
| **Author** | Chief Software Architect & Lead Engineer (independently reviewed and approved by Product & Solution Architect) |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | 04_MODULE_ARCHITECTURE |
| **Related Documents** | 00_PROJECT_GOVERNANCE, 01_PRODUCT_VISION, 02_PRODUCT_PRINCIPLES, 03_SYSTEM_ARCHITECTURE |
| **Applies To** | Every schema, migration, ORM, indexing, and storage-engine decision made downstream — this document is deliberately not that document |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-01 | Initial draft | First Data Architecture draft |
| 1.0 | 2026-08-01 | Added `DATA:CLASSIFICATION` (new §4: Public/Internal/Confidential/Sensitive/Operational/Derived/Temporary, architectural meaning only — no security implementation, encryption, permissions, or compliance, deferred to later Security and Engineering documents), renumbering §§4–15 to §§5–16 accordingly; added an explicit rule to `DATA:ENTITY_IDENTITY` ("identity is immutable for the lifetime of the entity and must never encode business meaning") with rationale. Status changed to Accepted following independent review by the Product & Solution Architect and Product Owner approval | Independent review requested these two refinements; no other architectural changes were made |

---

# 1. Purpose

**Identifier: DATA:PURPOSE**

This document defines how neXgen Core thinks about and governs its own data — ownership, boundaries, identity, lifecycle, consistency, and access rules — independent of any specific database technology. `04_MODULE_ARCHITECTURE` established which module owns which category of data; this document defines the rules that data must obey regardless of what storage engine eventually holds it.

This document is named Data Architecture, not Database Architecture, deliberately: a database schema is one possible implementation of the decisions in this document, not the subject of it. Schema, tables, columns, indexes, migrations, and ORM models belong to a future implementation-level document; this one must remain valid even if that implementation changes entirely.

---

# 2. Scope

**Identifier: DATA:SCOPE**

Per `GOVERNANCE:TECHNOLOGY_LEAKAGE`, this document is technology-independent. It defines data ownership, aggregate boundaries, entity identity, data lifecycle, transaction boundaries, consistency rules, audit data, retention, versioning, import/export ownership, search indexing responsibilities, and cross-module data access rules.

It does **not** define SQL schema, tables, columns, indexes, migrations, ORM models, or database engine specifics. A drafter who finds themselves naming a column type, a table, or an index while writing this document has drifted out of scope.

---

# 3. Data Ownership

**Identifier: DATA:OWNERSHIP**

`ARCH:DATA_OWNERSHIP` and `MODULE:DEFINITION` already establish that every module owns exactly one category of data, and no other module may access it except through that module's public contract (`MODULE:PUBLIC_CONTRACT`). This document does not restate that rule; it builds on it.

Ownership is total: the module that owns a category of data is responsible not only for storing it correctly, but for its lifecycle (`DATA:LIFECYCLE`), its consistency guarantees (`DATA:CONSISTENCY_RULES`), its audit trail (`DATA:AUDIT_DATA`), its retention (`DATA:RETENTION`), its import/export capability (`DATA:IMPORT_EXPORT`), and its search indexing (`DATA:SEARCH_INDEXING`). Ownership is not a storage-location decision — it is a responsibility.

---

# 4. Data Classification

**Identifier: DATA:CLASSIFICATION**

Every category of data a module owns is assigned exactly one platform-level classification. Classification is an architectural property of the data itself — what kind of information it is and what its exposure would mean — not a statement about who may access it, how it is protected, or what regulation applies to it. Those are the subjects of future Security and Engineering documents; this section defines only what each classification *means*, so those later documents have a stable vocabulary to build controls against.

- **Public** — information intended to be freely visible without restriction (e.g. a published product's catalog listing). No architectural sensitivity.
- **Internal** — information intended for use within the operating business, not published externally, but not damaging if seen by a trusted party outside its owning module (e.g. internal configuration values with no security implication).
- **Confidential** — information specific to the operating business that should not be exposed outside the business relationship it belongs to (e.g. supplier pricing terms, internal reporting figures).
- **Sensitive** — information whose exposure could cause real harm to a person or the business if mishandled (e.g. customer contact information, payment-related references, identity credentials). This is the classification most likely to carry hard requirements once Security and Engineering documents exist.
- **Operational** — information generated by the platform's own ongoing operation rather than entered by a person (e.g. stock movement records, audit entries per `DATA:AUDIT_DATA`). Operational data is often the most retention-sensitive category, per `DATA:RETENTION`.
- **Derived** — information computed or aggregated from other data rather than independently authoritative (e.g. a search index per `DATA:SEARCH_INDEXING`, a computed report total). Derived data is never a source of truth in its own right — this classification exists specifically to make that fact visible wherever it applies.
- **Temporary** — information with an inherently short, expected lifespan by its nature, not because of a retention policy decision (e.g. an in-progress checkout session before it becomes an order). Temporary data is expected to be superseded or discarded as a normal part of its own lifecycle, not deleted as an exception to `DATA:RETENTION`'s default-retain rule.

Every module, when defining the data it owns, states which classification each category of its data falls under. A single module may own data spanning more than one classification (for example, `MODULE:ORDERS` may own both Confidential business data and Operational audit data).

---

# 5. Aggregate Boundaries

**Identifier: DATA:AGGREGATE_BOUNDARIES**

Within a module's owned data, related pieces of data that must always change together and remain mutually consistent form an **aggregate**. Every aggregate has exactly one root — the entity through which the rest of the aggregate is reached and modified. Nothing outside the aggregate may modify a part of it directly; changes go through the aggregate root.

An aggregate boundary is drawn around the smallest set of data that genuinely must be consistent at every moment — not around everything a module happens to own. For example, within `MODULE:ORDERS`, an order and its line items form one aggregate (the total must always match the line items; they cannot be inconsistent even momentarily), but an order and a customer's entire order history do not — the history is a collection of separate aggregates, not one aggregate spanning all of them.

Aggregate boundaries are the mechanism that makes `DATA:TRANSACTION_BOUNDARIES` and `DATA:CONSISTENCY_RULES` enforceable: a transaction never needs to span more than one aggregate if aggregate boundaries are drawn correctly.

---

# 6. Entity Identity

**Identifier: DATA:ENTITY_IDENTITY**

Every entity that can be referenced independently has a stable identity, assigned once at creation and never reused, changed, or reassigned to a different entity — even after that entity is deleted or archived. An identity is meaningful only within the module that owns the entity; another module referencing that entity holds only the identity, never a copy of the entity's data as if it were authoritative.

**Entity identity is immutable for the lifetime of the entity and must never encode business meaning.**

This rule exists because business meaning changes and identity cannot. A human-readable label built from business meaning — a SKU derived from a category, a customer number derived from a signup date, an order number derived from a store code — will eventually need to change when the business fact it encodes changes (a product moves categories, a store is renamed, a numbering scheme is revised), and an identity that changes breaks every reference to it held anywhere else in the platform, violating the stability `MODULE:INTERACTION_RULES` and `ARCH:CROSS_DOMAIN_COMMUNICATION` depend on. Identity must be free to remain permanently correct precisely because it is never asked to also be meaningful.

Identity is distinct from any human-readable label (a name, an SKU, a reference number). Labels may change over an entity's lifetime; identity never does. This is what makes cross-module references in `MODULE:INTERACTION_RULES` and domain events in `ARCH:CROSS_DOMAIN_COMMUNICATION` reliable — an event referencing "this order" or "this product" must reference something whose identity cannot silently change out from under it.

---

# 7. Data Lifecycle

**Identifier: DATA:LIFECYCLE**

Every entity moves through explicit lifecycle states, and every transition between states must be an intentional, recorded action — never an implicit side effect of something else happening. At minimum, entities distinguish between:

- **Active** — currently in normal use.
- **Archived** — no longer in active use, but retained (per `DATA:RETENTION`) and still retrievable.
- **Deleted** — removed, subject to the retention and audit rules in `DATA:AUDIT_DATA` and `DATA:RETENTION`; deletion is a recorded event, not a silent disappearance.

A module's specific lifecycle states may be more detailed than this (an Order has states like placed, fulfilled, returned, that are business states, not data-lifecycle states — those belong to that module's own definition, not this document), but every module's specific lifecycle must map onto this general Active/Archived/Deleted framework at the data level, so that retention and audit rules can be applied consistently across the whole platform regardless of what business-specific states a module also tracks.

---

# 8. Transaction Boundaries

**Identifier: DATA:TRANSACTION_BOUNDARIES**

A transaction — a set of changes that must all succeed or all fail together — never spans more than one aggregate (`DATA:AGGREGATE_BOUNDARIES`). If an operation appears to require changing two aggregates atomically, the aggregate boundaries have likely been drawn incorrectly, or the operation should be reconsidered as two separate steps connected by an event rather than one atomic change.

This is a direct consequence of `ARCH:ARCHITECTURAL_STYLE` and `ARCH:CROSS_DOMAIN_COMMUNICATION`: cross-domain (and, at this finer grain, cross-aggregate) interaction happens through events, not through distributed or multi-aggregate transactions. Keeping transactions single-aggregate is what keeps the modular monolith's internal boundaries honest even though there is no network boundary forcing them.

---

# 9. Consistency Rules

**Identifier: DATA:CONSISTENCY_RULES**

- **Within an aggregate: consistency is immediate.** Every read of an aggregate reflects every write that has completed against it. There is no acceptable window where an order's total could be observed out of sync with its line items.
- **Across aggregates and across modules: consistency is eventual, achieved through domain events** (`ARCH:CROSS_DOMAIN_COMMUNICATION`). A module reacting to another module's event will do so slightly after the event occurred, not instantaneously — this is expected and acceptable, not a defect.
- **Eventual consistency must never be silent.** Per `PRINCIPLES:EXPLICIT_FAILURE`, if a module's reaction to an event fails or is delayed in a way that matters to the operator, that must surface, not disappear into a retry queue no one is watching.
- **Eventual consistency is not permitted to substitute for immediate consistency within a single aggregate** — a module may never justify a data-integrity gap within its own aggregate by pointing to this section; this eventual-consistency allowance applies only across the aggregate boundaries defined in `DATA:AGGREGATE_BOUNDARIES`.

---

# 10. Audit Data

**Identifier: DATA:AUDIT_DATA**

Per `PRINCIPLES:AUDITABILITY`, any action that changes business-critical data must leave a record of who did it, what changed, and when. This document makes that concrete at the data level: every module owning business-critical data (at minimum, every module classified Core or Stable per `MODULE:STABILITY`) must produce an audit record alongside every mutation to its aggregates.

Audit data is owned by the same module that owns the data it describes — there is no separate, centralized "audit module" that other modules write into, because that would violate `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` by creating two places responsible for knowing what happened to a module's own data. Every module's audit records follow the same structural expectation (actor, action, target entity identity, timestamp, before/after where meaningful) so that a platform-wide audit view can be composed by reading from every module's own audit data, without any module surrendering ownership of its own trail.

---

# 11. Retention

**Identifier: DATA:RETENTION**

Data is retained by default. Deletion is always an explicit, intentional action — never an implicit side effect of another operation, a cleanup job's assumption, or a storage-cost optimization performed without the operator's knowledge. This is a direct consequence of `VISION:PLATFORM_PROMISES` ("your business data belongs to you") and `PRINCIPLES:AUDITABILITY`.

- Active and Archived data (`DATA:LIFECYCLE`) is retained indefinitely unless the operator explicitly requests deletion or a specific legal or regulatory requirement mandates a retention limit — in which case that limit is stated explicitly by the module governing that data category, not assumed.
- Deleted data's audit record (`DATA:AUDIT_DATA`) — the fact that something was deleted, by whom, and when — is itself retained even after the underlying data is gone, so that deletion is auditable rather than untraceable.
- No module may silently expire or purge data as a matter of routine operation without this being a stated, intentional policy for that specific data category.

---

# 12. Versioning

**Identifier: DATA:VERSIONING**

Every mutable aggregate carries a version marker that changes whenever the aggregate changes. Before a write is accepted, the system must be able to detect whether the aggregate has changed since it was last read by whoever is making the write — and if it has, the conflict must be surfaced explicitly to the person making the change, never silently overwritten and never silently discarded.

This is a direct, deliberate consequence of `PRINCIPLES:EXPLICIT_FAILURE`: a lost update — where one person's change silently overwrites another's because neither was told about the conflict — is exactly the kind of silent failure that principle exists to prevent. This rule applies regardless of how many people or processes might plausibly write to the same aggregate concurrently; the guarantee does not depend on how likely a conflict is thought to be.

---

# 13. Import / Export Ownership

**Identifier: DATA:IMPORT_EXPORT**

The module that owns a category of data is also responsible for that data's import and export capability — there is no generic, cross-cutting "data export" mechanism that reaches into every module's data independently of that module's own rules. This directly satisfies `VISION:PLATFORM_PROMISES`'s commitment that a business's data can be extracted "in a usable form" — export is not an afterthought bolted onto storage, it is a responsibility every owning module carries from the start.

Import follows the same ownership rule: data entering the platform for a given category is validated and accepted by that category's owning module, subject to that module's own consistency and identity rules (`DATA:ENTITY_IDENTITY`, `DATA:CONSISTENCY_RULES`) — an import mechanism never bypasses a module's own rules to insert data faster or more conveniently.

---

# 14. Search Indexing Responsibilities

**Identifier: DATA:SEARCH_INDEXING**

A search index over a module's data is a derived, read-optimized view — never a second source of truth. The owning module remains authoritative; the index exists to make finding that data faster, not to hold information the owning module doesn't also hold. Per `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`, it must always be possible to rebuild a search index entirely from its owning module's data, with no information loss, because the index was never carrying anything the module didn't already own.

The owning module is responsible for keeping its own search index current as its data changes — search indexing is not a separate module's job to perform on another module's behalf, since that would require the indexing module to read another module's internal data directly, which `DATA:CROSS_MODULE_ACCESS` forbids.

---

# 15. Cross-Module Data Access Rules

**Identifier: DATA:CROSS_MODULE_ACCESS**

This section restates and makes data-specific what `MODULE:INTERACTION_RULES` and `MODULE:PUBLIC_CONTRACT` already establish at the module level:

- No module may read or write another module's underlying data directly, regardless of domain, regardless of how convenient it would be.
- A module may hold a read-optimized copy or projection of another module's data for its own internal purposes (for example, `MODULE:REPORTING` maintaining its own view built from events it has consumed) — but that copy is never authoritative, is never written back to the owning module, and is understood by every party to be a derived convenience, not a second source of truth.
- Any data a module needs from another module arrives either through that module's public contract (a direct call, permitted only within the same domain per `MODULE:INTERACTION_RULES`) or through a domain event (`ARCH:CROSS_DOMAIN_COMMUNICATION`) — never through any other channel.

---

# 16. Relationship to Other Documents

**Identifier: DATA:AUTHORITY**

This document is subordinate to `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, `02_PRODUCT_PRINCIPLES`, `03_SYSTEM_ARCHITECTURE`, and `04_MODULE_ARCHITECTURE`. Every rule above is a direct consequence of a decision already made in one of those documents — this document introduces no new domains, no new modules, and no new product direction; it only makes existing decisions concrete at the level of data.

Any future document defining schema, storage technology, or implementation (not yet named in the roadmap, but understood to follow this document) must be consistent with the rules established here. If that future document is found to require violating a rule in this document, this document is revised through `GOVERNANCE:CHANGE_MANAGEMENT` first — never silently reinterpreted to fit an implementation convenience, per `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`'s underlying logic that architecture should not bend to what a technology happens to make easy.

---

End of Document
