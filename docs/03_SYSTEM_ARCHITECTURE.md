# neXgen Core
## 03_SYSTEM_ARCHITECTURE

| Field | Value |
|---|---|
| **Title** | System Architecture |
| **Document ID** | ARCH |
| **Version** | 1.3 |
| **Status** | Accepted |
| **Author** | Chief Software Architect & Lead Engineer (independently reviewed and approved by Product & Solution Architect) |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | 03_SYSTEM_ARCHITECTURE_PLAN |
| **Related Documents** | 00_PROJECT_GOVERNANCE, 01_PRODUCT_VISION, 02_PRODUCT_PRINCIPLES, ADR-0001 through ADR-0008 |
| **Applies To** | Every module, database, API, UI, security, engineering, testing, and deployment decision made downstream in `04_MODULE_ARCHITECTURE.md` onward |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-01 | Initial draft | First System Architecture draft, written against `03_SYSTEM_ARCHITECTURE_PLAN` v0.3 and the three resolved blocking decisions |
| 0.2 | 2026-08-01 | Restructured `ARCH:TECHNOLOGY_DECISIONS` (§9) into 9.1 (API Style, retained as a genuine architectural decision) and 9.2 (backend runtime, datastore, state store, admin interface, storefront rendering, deployment packaging — all restated as architectural *requirements* with the specific technology deferred entirely to their ADRs); removed remaining concrete technology names from `ARCH:RISKS` | Product Owner review: the document should not be tightly coupled to specific implementation technologies; only technology choices that are themselves architectural constraints belong here |
| 1.0 | 2026-08-01 | Status changed to Accepted following independent review by the Product & Solution Architect and Product Owner approval | Completed the Document Lifecycle defined in `GOVERNANCE:DOCUMENT_LIFECYCLE` |
| 1.1 | 2026-08-01 | Fixed two remaining stale references to `05_DATABASE_ARCHITECTURE.md` (in `ARCH:DATA_OWNERSHIP` and `ARCH:RISKS`), missed during the earlier `04_MODULE_ARCHITECTURE` / `00_PROJECT_GOVERNANCE` rename pass — no content change | Caught during self-review while drafting `08_SECURITY_STANDARD.md`; cross-references must stay valid per the project's documentation rules |
| 1.2 | 2026-08-01 | Fixed two raw section-number references (`03_SYSTEM_ARCHITECTURE_PLAN` §13 → `ARCH_PLAN:RESOLVED_DECISIONS`; `GOVERNANCE §6` → `GOVERNANCE:DOCUMENTATION_HIERARCHY`) — no content change | Final documentation audit across `00`–`11` found these two citations had never been converted to stable identifiers |
| 1.3 | 2026-08-02 | Updated `ARCH:TECHNOLOGY_DECISIONS` §9.2's closing note: `ADR-0001`, `ADR-0002`, `ADR-0003`, `ADR-0004`, `ADR-0007`, and `ADR-0008` have reached Accepted status with Product Owner confirmation; `ADR-0005`/`ADR-0006` remain Draft pending their implementation phases — no architectural content change | Implementation of `04_MODULE_ARCHITECTURE` module 1 (Platform Foundation) required these six ADRs to satisfy `GOVERNANCE:COMPLETION_RULE` before code could be written against them, per `GOVERNANCE:CHANGE_MANAGEMENT` |

---

# 1. Purpose

**Identifier: ARCH:PURPOSE**

This document defines neXgen Core's structure at the system level: its architectural style, its top-level domains, how those domains communicate, its approach to data ownership and extensibility, its non-functional principles, and the specific technologies chosen to realize all of the above.

It operationalizes `01_PRODUCT_VISION` and `02_PRODUCT_PRINCIPLES` into structural decisions. It does not define modules within domains, database schemas, API contracts, UI structure, specific security controls, or code — those are the subjects of `04_MODULE_ARCHITECTURE.md` onward, per `03_SYSTEM_ARCHITECTURE_PLAN` §7 (`ARCH_PLAN:OUT_OF_SCOPE`).

---

# 2. Architectural Style

**Identifier: ARCH:ARCHITECTURAL_STYLE**

neXgen Core is architected as a **modular monolith**: a single deployable backend application unit, internally organized into domains with enforced code-level boundaries, communicating internally through defined interfaces and domain events rather than network calls between independently deployed services.

This decision is fully justified in **`ADR-0001`**. In summary: it satisfies the self-hosted-first hosting decision (`ARCH_PLAN:RESOLVED_DECISIONS` item 3) and `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` by requiring only one deployable unit for a merchant to run, while still supporting `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` and future multi-tenant readiness (`ARCH_PLAN:RESOLVED_DECISIONS` item 1) through enforced internal domain boundaries rather than either the ambiguity of an unstructured monolith or the operational weight of microservices.

---

# 3. System Context

**Identifier: ARCH:SYSTEM_CONTEXT**

neXgen Core is a single system boundary, interacting with:

- **Merchants and staff (operators)** — manage store configuration, catalog, inventory, orders, and fulfillment.
- **Customers** — browse, purchase, and track orders.
- **Payment processors** — external systems the platform delegates payment charging and refunding to; the platform never assumes ownership of card data itself (a constraint `08_SECURITY_STANDARD.md` will formalize).
- **Shipping and courier carriers** — external systems providing rates, labels, and tracking.
- **Email and notification providers** — external systems the platform delegates outbound communication to.
- **Supplier systems** — a future integration point, not required for Phase 1.

No internal structure is exposed at this level. See the System Context Diagram: `docs/diagrams/system-context.md`.

---

# 4. Domain Map

**Identifier: ARCH:DOMAIN_MAP**

neXgen Core is divided into four top-level domains:

- **Platform** — Identity & Access, Store Configuration, Settings, Media, and the platform's extensibility surface. Every other domain depends on Platform; Platform depends on none of them.
- **Commerce** — Catalog, Inventory, Pricing, Promotions, Orders, and Checkout. The domain most directly responsible for `VISION:MISSION`.
- **Operations** — Shipping, Fulfillment, Returns, and Supplier Management. Reacts to events from Commerce (e.g. an order being placed triggers fulfillment work) without owning Commerce's data.
- **Growth** — Reporting, CRM, Marketing, and Automation. Consumes events from Commerce and Operations for insight; is depended upon by neither, consistent with `VISION:NON_GOALS` rejecting the platform becoming feature-heavy at the expense of architectural integrity, and reflecting that most Growth capability is designed for, not built in, Phase 1.

This is a domain map, not a module list — the modules within each domain (e.g. what specifically lives inside Commerce) are the subject of `04_MODULE_ARCHITECTURE.md`, per `ARCH_PLAN:OUT_OF_SCOPE`.

See the Domain Map Diagram: `docs/diagrams/domain-map.md`.

---

# 5. Cross-Domain Communication

**Identifier: ARCH:CROSS_DOMAIN_COMMUNICATION**

Within a domain, direct calls between components are permitted. Across domains, communication happens only through an **in-process domain event bus** — a domain publishes an event describing something that happened (e.g. "OrderPlaced"); other domains subscribe to events relevant to them and react independently. No domain queries or writes another domain's underlying data directly.

The event bus is in-process for Phase 1, consistent with the modular monolith (`ARCH:ARCHITECTURAL_STYLE`), but is accessed through an abstraction rather than called directly, so that a future move to a distributed message broker — should multi-tenant SaaS scale ever require extracting a domain into its own service — is possible as an extension of the existing interface, not a redesign. This is the specific technical mechanism satisfying `ARCH_PLAN:RESOLVED_DECISIONS` item 1's requirement that the SaaS transition require extension, not redesign.

See the Cross-Domain Communication Diagram: `docs/diagrams/cross-domain-flow.md`.

---

# 6. Data Ownership Principles

**Identifier: ARCH:DATA_OWNERSHIP**

Every category of data has exactly one owning domain. A domain that needs data it does not own asks the owning domain for it — through a direct call within the same domain group, or through an event across domains — and never queries or writes the owning domain's underlying storage directly. This is the architectural enforcement mechanism for `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`.

Every domain's owned data is designed, from Phase 1 onward, with an implicit installation/tenant boundary at the conceptual level — even though Phase 1 operates with exactly one tenant per installation. This means the schema and data-access patterns defined in `05_DATA_ARCHITECTURE.md` should include a tenant-scoping dimension from the start, enforced but not exercised in Phase 1, so that introducing real multi-tenancy later is a matter of enforcing an existing boundary rather than retrofitting one. This directly satisfies `ARCH_PLAN:RESOLVED_DECISIONS` item 1.

---

# 7. Extensibility Model

**Identifier: ARCH:EXTENSIBILITY_MODEL**

The platform must allow new capability to be added without modifying core domain code, per `VISION:PLATFORM_PROMISES` and `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`. At the system level, this document establishes the constraint only, not the mechanism:

- Extensions may observe and react to domain events (`ARCH:CROSS_DOMAIN_COMMUNICATION`) without being granted direct access to a domain's owned data.
- Extensions may add configuration, not arbitrary code paths into existing domain logic.
- No extension mechanism may require patching or forking core domain code to function.

The concrete extension contract — how an extension registers itself, what lifecycle it follows, what guarantees it is given — is deferred to `04_MODULE_ARCHITECTURE.md`, where module boundaries will make the correct shape of an extension surface clearer, per the recommendation carried forward from `03_SYSTEM_ARCHITECTURE_PLAN` (`ARCH_PLAN:RESOLVED_DECISIONS`).

---

# 8. Non-Functional Requirements

**Identifier: ARCH:NFR**

Per `03_SYSTEM_ARCHITECTURE_PLAN` §13 (`ARCH_PLAN:RESOLVED_DECISIONS` item 2), this section states principles, not capacity figures. This is a permanent section of this document, not deferred elsewhere.

- **Horizontally Scalable** — the Application Unit and Background Worker(s) are stateless (see below), so additional instances of either can be run to handle increased load without architectural change.
- **Modular** — domain boundaries (`ARCH:DOMAIN_MAP`) are enforced in code structure, not left to convention alone.
- **Stateless Where Appropriate** — session, cache, and queue state live outside the Application Unit (`ADR-0004`), not in-process, so that any request can be handled by any running instance.
- **Observable** — the system must expose enough information (structured logs, a health-check surface consistent with the pattern already established for the platform's update mechanism) that its operational state is knowable without inspecting code.
- **Fault Tolerant** — a failure in one external integration (a payment processor, a carrier) must not take down unrelated platform functionality; failures are handled explicitly per `PRINCIPLES:EXPLICIT_FAILURE`, never silently.
- **Upgradeable** — directly inherits `PRINCIPLES:PREDICTABLE_UPGRADES` and `VISION:PLATFORM_PROMISES`; the architecture must not make routine upgrades risky.
- **Maintainable** — directly inherits `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` and `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`.

Concrete performance targets and capacity sizing may be specified later — in an ADR, or as operational guidance — without requiring this section or the architecture it describes to change, only to be tuned.

---

# 9. Technology Decisions

**Identifier: ARCH:TECHNOLOGY_DECISIONS**

This document names a specific technology only where the *choice itself* is an architectural constraint — something that shapes how domains are structured, how they communicate, or what guarantees the system can make to the rest of the architecture — rather than an interchangeable implementation detail. Implementation-level choices (a specific language, framework, or product) are decided and justified entirely within their own ADR; this document states only the architectural requirement that choice must satisfy, and points to the ADR for the actual selection.

## 9.1 Retained as an Architectural Decision

**API Style: REST, documented via OpenAPI.** Unlike the categories in §9.2, the API's style is itself architecturally significant, not an interchangeable implementation detail: it is the mechanism through which `ARCH:CROSS_DOMAIN_COMMUNICATION` is exposed externally, the surface `ARCH:EXTENSIBILITY_MODEL` depends on, and the boundary `VISION:NON_GOALS` relies on to keep third-party integration possible without vendor lock-in. Choosing REST over, say, GraphQL changes what the system's external contract looks like structurally — it is not swappable the way a specific backend language is. Full rationale and alternatives considered: `ADR-0007`.

## 9.2 Deferred to Implementation-Level ADRs

Each category below has a real architectural requirement, stated here — but the specific technology satisfying it is an implementation choice, not a structural one. The requirement is fixed by this document; the selection may change without this document changing, provided the requirement is still met.

| Category | Architectural Requirement | Selection |
|---|---|---|
| Backend runtime | Must support enforcing the domain boundaries in `ARCH:DOMAIN_MAP` in code, and must be deployable self-hosted without specialized operational expertise (`PRINCIPLES:OPERATIONAL_ACCESSIBILITY`). | See `ADR-0002` |
| Primary datastore | Must be relational, supporting the referential integrity `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` depends on, and deployable without specialized database administration expertise. | See `ADR-0003` |
| Externalized state store | Must live outside the Application Unit, providing the externalized cache, session, and queue state that makes the Application Unit stateless, per `ARCH:NFR`. | See `ADR-0004` |
| Admin interface | Must interact with the backend exclusively through the API defined in §9.1, and must be independently deployable from the backend and the storefront. | See `ADR-0005` |
| Storefront rendering | Must support search-engine discoverability and fast first-paint for anonymous visitors — a merchant's ability to be found and to convert visitors, per `PRINCIPLES:MERCHANT_FIRST`. | See `ADR-0006` |
| Local / self-hosted deployment packaging | Must allow a self-hosted operator to run the full topology in `ARCH:DEPLOYMENT_TOPOLOGY` without individually installing and configuring each dependency, per `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`. | See `ADR-0008` |

As of 2026-08-02, `ADR-0001`, `ADR-0002`, `ADR-0003`, `ADR-0004`, `ADR-0007`, and `ADR-0008` have reached Accepted status, each with Product Owner confirmation recorded in its own Change Log per `GOVERNANCE:ADR_OWNERSHIP` — these six underlie Platform Foundation and are binding. `ADR-0005` (admin interface) and `ADR-0006` (storefront rendering) remain at Draft status pending the implementation phases that require them; this is expected under `ARCH_PLAN:REVIEW_CHECKLIST`'s requirement that every technology decision have at minimum a drafted ADR, not that every ADR reach Accepted status before any implementation begins.

---

# 10. Deployment Topology (Conceptual)

**Identifier: ARCH:DEPLOYMENT_TOPOLOGY**

A single neXgen Core installation consists of: an Application Unit (handles web/API requests), one or more Background Worker(s) (process queued jobs), a Cache/Session/Queue store, and a Primary Datastore — plus independently built and deployed Storefront and Admin frontends that communicate with the Application Unit only through the REST API.

The Application Unit and Background Worker(s) are stateless, so multiple instances of either can run concurrently against the same Cache and Datastore, satisfying `ARCH:NFR`'s horizontal scalability principle. This same shape supports a future multi-tenant deployment without structural change, per `ARCH_PLAN:RESOLVED_DECISIONS` item 1 — no orchestration platform is assumed at this level (see `ADR-0008`); that decision belongs in `11_DEPLOYMENT_STANDARD.md`.

See the Conceptual Deployment Topology Diagram: `docs/diagrams/deployment-topology.md`.

---

# 11. Risks and Trade-offs

**Identifier: ARCH:RISKS**

- **Domain boundary discipline.** The modular monolith (`ADR-0001`) depends on enforced code-level boundaries, not a network boundary. If code review discipline (to be formalized in `09_ENGINEERING_STANDARD.md`) lapses, domain boundaries can erode without any immediate failure signaling it. Revisit this architectural style if a specific domain's operational load genuinely cannot be served within the shared deployable unit at some future scale — this is the condition under which extracting that domain into its own service, enabled by the event-bus abstraction in `ARCH:CROSS_DOMAIN_COMMUNICATION`, becomes justified.
- **In-process event bus at Phase 1 scale.** Adequate for a single self-hosted installation; its abstraction must be genuinely swappable, not just conceptually described, or the "extension not redesign" requirement for a future SaaS transition (`ARCH_PLAN:RESOLVED_DECISIONS` item 1) will not actually hold at implementation time. This should be an explicit test case when `04_MODULE_ARCHITECTURE.md` and later implementation define the event bus's concrete interface.
- **Tenant-scoping designed in but unexercised.** Some Phase 1 schema and data-access decisions will look more complex than a single-tenant system strictly requires, because they anticipate multi-tenancy that will not be exercised yet. `04_MODULE_ARCHITECTURE.md` and `05_DATA_ARCHITECTURE.md` should state this explicitly wherever it applies, so a future contributor does not mistake deliberate readiness for accidental complexity.
- **Backend runtime choice trades novelty for maturity.** The selected runtime (see `ADR-0002`) is a mature, well-supported choice for this platform's self-hosted, operationally-accessible target rather than a currently-trending alternative. The REST API boundary (`ADR-0007`, retained here in `ARCH:TECHNOLOGY_DECISIONS` §9.1 as an architectural decision) is what keeps the runtime choice reversible in principle, per `VISION:DECISION_FILTER` question 5 — the backend implementation could theoretically change without requiring either frontend to change, as long as the API contract is preserved.

---

# 12. Relationship to Other Documents

**Identifier: ARCH:AUTHORITY**

This document is subordinate to `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, and `02_PRODUCT_PRINCIPLES`. Every technology and structural decision made here must be traceable to a specific Vision or Principles citation, or to `ARCH_PLAN:RESOLVED_DECISIONS`.

`ADR-0001` through `ADR-0008` are authoritative alongside this document, not subordinate to it or to any document listed after it in the Documentation Hierarchy, per `GOVERNANCE:DOCUMENTATION_HIERARCHY`.

`04_MODULE_ARCHITECTURE.md` and every document after it must be consistent with the decisions established here. If a lower-level document is found to require violating one of these decisions, the lower-level document is revised, or this document is revised through `GOVERNANCE:CHANGE_MANAGEMENT` — this document is not silently reinterpreted to accommodate a downstream conflict.

---

End of Document
