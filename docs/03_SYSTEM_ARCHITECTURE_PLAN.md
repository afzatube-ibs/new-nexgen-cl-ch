# neXgen Core
## 03_SYSTEM_ARCHITECTURE_PLAN

| Field | Value |
|---|---|
| **Title** | System Architecture — Document Plan |
| **Document ID** | ARCH_PLAN |
| **Version** | 0.3 (Draft) |
| **Status** | Draft — closed out, ready to draft 03_SYSTEM_ARCHITECTURE.md against |
| **Author** | Chief Software Architect & Lead Engineer |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | 02_PRODUCT_PRINCIPLES |
| **Related Documents** | 00_PROJECT_GOVERNANCE, 01_PRODUCT_VISION |
| **Applies To** | The drafting and review of `03_SYSTEM_ARCHITECTURE.md` only |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-01 | Initial draft | First plan for how `03_SYSTEM_ARCHITECTURE.md` will be structured, scoped, and reviewed |
| 0.2 | 2026-08-01 | Resolved all 3 blocking open questions per Product Owner decision: multi-tenant-ready architecture with single-tenant Phase 1 implementation; NFRs stated as principles only, concrete figures deferred to a new `NFR_STANDARD.md`; self-hosted Phase 1 with hosting never mandated. Updated Required Sections (6, 8), Review Checklist, and replaced §13 (Open Questions) with §13 (Resolved Decisions) plus new §13a flagging that `NFR_STANDARD.md` needs an explicit roadmap placement decision | Product Owner resolved the 3 blockers identified in v0.1 §13 |
| 0.3 | 2026-08-01 | Removed the proposed `NFR_STANDARD.md` document and §13a entirely — Product Owner decided the constitutional roadmap remains unchanged and NFRs stay permanently as a dedicated section within `03_SYSTEM_ARCHITECTURE.md` | Product Owner explicit decision |

---

# 1. Purpose

**Identifier: ARCH_PLAN:PURPOSE**

This document is not the System Architecture. It is the specification for how `03_SYSTEM_ARCHITECTURE.md` will be written, so that its drafting is deterministic rather than improvised, and its review is a check against a known standard rather than a subjective read.

Every foundation document produced so far — `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, `02_PRODUCT_PRINCIPLES` — was drafted first and structured second, with structure emerging from review feedback after the fact. `03_SYSTEM_ARCHITECTURE.md` is a materially larger and more consequential document than any of the three that preceded it: it is the first Technology-Specific document in the hierarchy (`GOVERNANCE:TECHNOLOGY_LEAKAGE`), the first document to make decisions that are expensive to reverse, and the document every subsequent document in the roadmap depends on. It should not be drafted the same improvised way.

---

# 2. Scope

**Identifier: ARCH_PLAN:SCOPE**

`03_SYSTEM_ARCHITECTURE.md` defines the platform's structure at the **system level**: the architectural style, the top-level domains the system is divided into, how those domains communicate, the platform's approach to data ownership, extensibility, and non-functional requirements, and the technology decisions made to support all of the above.

It operates one level above `04_MODULE_ARCHITECTURE.md`. System Architecture decides *that* the platform is divided into domains and *how domains relate to each other*; Module Architecture decides *what modules exist within each domain* and their internal boundaries. This distinction is the single most important scope boundary in this plan, and is elaborated in Sections 6 and 7 below.

---

# 3. Required Sections

**Identifier: ARCH_PLAN:REQUIRED_SECTIONS**

`03_SYSTEM_ARCHITECTURE.md` must contain the following sections. Each is described briefly here; the architecture document itself will contain the actual content.

1. **Purpose** — why this document exists, its relationship to Vision and Principles.
2. **Architectural Style** — the platform's fundamental structural approach (e.g. how services relate to one another, deployment unit granularity), stated as a decision with rationale, backed by an Engineering ADR.
3. **System Context** — what the system is, its external boundaries, and what lies outside it (external payment processors, carriers, third-party integrations) without specifying integration details.
4. **Domain Map** — the platform's top-level domains and the relationships between them, at a level of abstraction that does not enumerate modules.
5. **Cross-Domain Communication** — the platform's approach to how domains interact (direct calls, events, some combination), stated as a principle-level decision, not a technology-level one.
6. **Data Ownership Principles** — which domain owns which category of data at a conceptual level, and the rule for how other domains access data they do not own. Not a schema. Must be drawn so that a future tenant boundary could be introduced without restructuring domain ownership, per `ARCH_PLAN:RESOLVED_DECISIONS` item 1 — this does not mean designing tenancy now, only avoiding decisions that would foreclose it later.
7. **Extensibility Model** — how the platform supports adding capability without modifying the core, satisfying `VISION:NON_GOALS` and `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`, at an architectural (not implementation) level.
8. **Non-Functional Requirements** — stated as *principles* (e.g. horizontally scalable, modular, stateless where appropriate, observable, fault tolerant, upgradeable, maintainable), not capacity figures. This is a permanent, standalone section within this document, not deferred elsewhere; concrete performance targets and sizing may be specified later without requiring this section to be redesigned, only extended.
9. **Technology Decisions** — the specific technologies chosen at the system level, each with a pointer to the Engineering ADR that justifies it. This section does not contain the rationale itself — the rationale lives in the ADR.
10. **Deployment Topology (Conceptual)** — how the system is deployed in shape, not in tooling (e.g. "a single deployable unit with supporting background workers," not specific orchestration tooling — that belongs in `11_DEPLOYMENT_STANDARD`).
11. **Risks and Trade-offs** — architectural decisions made under uncertainty, stated explicitly, with the conditions under which they should be revisited.
12. **Relationship to Other Documents** — authority and subordination, matching the pattern established in `VISION:AUTHORITY` and `PRINCIPLES:AUTHORITY`.

---

# 4. Section Ordering

**Identifier: ARCH_PLAN:SECTION_ORDERING**

The ordering in Section 3 above is the required ordering. It is deliberate: Architectural Style must be decided before System Context can be meaningfully bounded; System Context must exist before a Domain Map can be drawn accurately; the Domain Map must exist before Cross-Domain Communication and Data Ownership can be specified, since both describe relationships *between* domains. Non-Functional Requirements are placed before Technology Decisions because technology choices should be justified by NFR targets, not the reverse. Technology Decisions precede Deployment Topology because deployment shape follows from what is being deployed.

A drafter must not front-load Technology Decisions or produce a Domain Map before Architectural Style is settled — doing so inverts the document's own dependency chain and produces a document that reads as a set of conclusions with no traceable reasoning.

---

# 5. Dependencies

**Identifier: ARCH_PLAN:DEPENDENCIES**

`03_SYSTEM_ARCHITECTURE.md` depends on the following, all already Accepted:

- **`VISION:AUDIENCE`** — the priority ordering of who the platform serves shapes which architectural trade-offs are acceptable (e.g. how much complexity is justified in service of multi-store operators, priority 3, versus enterprise, priority 4).
- **`VISION:NON_GOALS`** — several non-goals directly constrain architecture: no mandatory vendor-hosted infrastructure, no closed-ecosystem data access, no plugin-marketplace-first model, no forced non-optional updates. Any architectural style incompatible with these must be rejected before it is written down.
- **`VISION:PLATFORM_PROMISES`** — "extensions do not require modifying the core" and "every operational rule lives in one place" are structural commitments, not aspirational language; the architecture must be able to demonstrate how it satisfies them.
- **`PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`, `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`, `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`, `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`** — these four principles have the most direct architectural consequence of the ten and should be treated as binding constraints on the Domain Map and Cross-Domain Communication sections specifically.
- **`GOVERNANCE:TECHNOLOGY_LEAKAGE`** — confirms this document is Technology Specific; technology names are expected and appropriate here, unlike in Vision or Principles.
- **`GOVERNANCE:DECISION_AUTHORITY` / ADR Ownership** — every technology decision in this document must be backed by an Engineering ADR, drafted under the same review cycle defined there.

---

# 6. What Belongs Here

**Identifier: ARCH_PLAN:IN_SCOPE**

- The platform's architectural style and the reasoning for it.
- The top-level domain map (domain names, domain responsibilities, domain relationships) — not the modules within each domain.
- The platform's approach to cross-domain communication, stated as a pattern, not an implementation.
- Conceptual data ownership rules (which domain is authoritative for which category of information).
- The extensibility model, at the level of "how the platform allows new capability without core modification," not a plugin API specification.
- Non-functional requirement targets and the architectural implications of meeting them.
- The specific technologies chosen at the system level (backend runtime, primary datastore, caching layer, queueing approach, frontend approach), each pointing to its own ADR.
- Deployment topology described in terms of shape (what gets deployed as a unit, what runs continuously in the background), not deployment tooling or infrastructure-as-code.

---

# 7. What Explicitly Does NOT Belong Here

**Identifier: ARCH_PLAN:OUT_OF_SCOPE**

- **Module-level design.** A full module list, module responsibilities, and module-to-module contracts belong in `04_MODULE_ARCHITECTURE.md`. System Architecture names domains; it does not name modules within them.
- **Database schema.** Table names, columns, keys, indexes belong in `05_DATA_ARCHITECTURE.md`. This document may state data-ownership principles but must not describe a schema.
- **API contracts.** Endpoint definitions, request/response shapes, versioning scheme belong in `06_API_STANDARD.md`.
- **UI structure or design system detail.** Belongs in `07_UI_DESIGN_SYSTEM.md`.
- **Specific security control implementation.** The architecture may state that a security posture is required to satisfy `PRINCIPLES:SECURITY_FIRST`; specific controls belong in `08_SECURITY_STANDARD.md`.
- **Coding standards, testing strategy, or CI/CD pipeline detail.** Belong in `09_ENGINEERING_STANDARD.md`, `10_TESTING_STANDARD.md`, and `11_DEPLOYMENT_STANDARD.md` respectively.
- **Any code.** This is an architecture document, not an implementation artifact.

A drafter who finds themselves naming a specific table, a specific endpoint, or a specific module's internal class structure while writing this document has drifted out of scope and should stop and redirect that content to the correct downstream document.

---

# 8. Required Diagrams

**Identifier: ARCH_PLAN:DIAGRAMS**

The following diagrams are required and must be stored under `docs/diagrams/`, referenced from the document rather than embedded as unreferenced binary content:

1. **System Context Diagram** — the system as a single box, its external actors (merchants, customers, staff) and external systems (payment processors, carriers) it communicates with, with no internal detail.
2. **Domain Map** — the platform's top-level domains and the relationships between them. Domains only — no modules, no tables, no endpoints.
3. **Cross-Domain Communication Diagram** — illustrating the chosen communication pattern between domains (e.g. a simplified sequence or flow diagram showing how a cross-domain operation moves through the system conceptually).
4. **Conceptual Deployment Topology Diagram** — the shape of what gets deployed, without naming specific infrastructure or orchestration products.

Diagrams are not decorative. Each diagram must correspond to and be referenced by the section it illustrates; a diagram with no corresponding textual explanation, or text describing a relationship with no corresponding diagram where one of the four above would clarify it, is incomplete.

---

# 9. Cross-Document References

**Identifier: ARCH_PLAN:CROSS_REFERENCES**

`03_SYSTEM_ARCHITECTURE.md` must cite, using stable identifiers, at minimum:

- `VISION:AUDIENCE`, `VISION:NON_GOALS`, `VISION:PLATFORM_PROMISES` (justifying architectural constraints)
- `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`, `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`, `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`, `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`, `PRINCIPLES:SECURITY_FIRST` (justifying specific architectural choices)
- `GOVERNANCE:DECISION_AUTHORITY`, `GOVERNANCE:TECHNOLOGY_LEAKAGE` (process compliance)

`03_SYSTEM_ARCHITECTURE.md` must also establish its own stable identifier namespace, `ARCH:*` (e.g. `ARCH:ARCHITECTURAL_STYLE`, `ARCH:DOMAIN_MAP`, `ARCH:EXTENSIBILITY_MODEL`), since `04_MODULE_ARCHITECTURE.md` and every document after it will need to cite specific System Architecture decisions without depending on section numbers, consistent with the identifier convention already in use across the accepted documents.

---

# 10. Review Checklist

**Identifier: ARCH_PLAN:REVIEW_CHECKLIST**

Before `03_SYSTEM_ARCHITECTURE.md` is submitted for independent review, it must satisfy:

- [ ] All 12 required sections present, in the required order.
- [ ] All 4 required diagrams present and each referenced from its corresponding section.
- [ ] Every technology decision in the Technology Decisions section has a corresponding Engineering ADR (drafted, even if not yet Accepted).
- [ ] No module-level, schema-level, API-level, UI-level, or code-level detail present anywhere in the document (cross-check against Section 7 of this plan).
- [ ] Every architectural constraint traceable to a specific Vision or Principles citation, not stated as free-standing preference.
- [ ] Domain Map and Data Ownership Principles avoid foreclosing future multi-tenancy, without introducing tenant-specific complexity into Phase 1 (`ARCH_PLAN:RESOLVED_DECISIONS` item 1).
- [ ] Non-Functional Requirements section states principles only, with no invented capacity figures (`ARCH_PLAN:RESOLVED_DECISIONS` item 2).
- [ ] No assumption of vendor-controlled or mandatory hosted infrastructure anywhere in the document (`ARCH_PLAN:RESOLVED_DECISIONS` item 3).
- [ ] `ARCH:*` identifiers assigned to every section a future document is likely to cite.
- [ ] Self-contained: understandable without this plan document or chat history, per `GOVERNANCE:SELF_CONTAINED_DOCUMENTATION`.
- [ ] Consistent with `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, and `02_PRODUCT_PRINCIPLES` with no contradictions.
- [ ] Full metadata block and Change Log present, per established format.

---

# 11. Acceptance Criteria

**Identifier: ARCH_PLAN:ACCEPTANCE_CRITERIA**

`03_SYSTEM_ARCHITECTURE.md` is ready for Accepted status only when:

1. It has passed the Review Checklist in Section 10 above in full.
2. It has passed Engineering Review (self-review, since the Chief Software Architect is the expected drafter) and independent review by the Product & Solution Architect.
3. Every Engineering ADR it depends on has itself at minimum reached Draft status with a clear path to Accepted — the architecture should not depend on a technology decision that has not been reasoned through as its own ADR.
4. The Product Owner has confirmed the architectural style and domain map do not conflict with their understanding of the product direction.
5. No open item remains where a decision was deferred without being explicitly logged as a risk (Section 11 of the architecture document itself) or escalated per `GOVERNANCE:DECISION_AUTHORITY`.

---

# 12. Risks If Written Incorrectly

**Identifier: ARCH_PLAN:RISKS**

- **If Module Architecture detail leaks into System Architecture:** `04_MODULE_ARCHITECTURE.md` becomes either redundant with `03` or silently contradicts it, and the two documents drift apart over time since changes to one will not reliably propagate to the other.
- **If the Extensibility Model is vague or absent:** the platform has no way to honor `VISION:PLATFORM_PROMISES` ("extensions do not require modifying the core") when the first real extension request arrives, and the constraint gets solved ad hoc during implementation instead of being designed for from the start.
- **If Non-Functional Requirements are skipped or left implicit:** every downstream document — Database Architecture, API Standard, Security Standard, Testing Standard — will be forced to invent its own assumptions about scale, availability, and performance, and those assumptions will not agree with each other.
- **If Technology Decisions are made without corresponding ADRs:** the project loses the ability to explain, to a future contributor, why a given technology was chosen over its alternatives — precisely the failure mode the ADR process exists to prevent.
- **If Data Ownership Principles are omitted:** `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` becomes unenforceable in practice, because no document will have stated which domain is authoritative for which data, and duplication will be discovered only after modules are built around conflicting assumptions.
- **If the document is not self-contained:** it fails `GOVERNANCE:SELF_CONTAINED_DOCUMENTATION` outright, and every future contributor's understanding of the system's shape becomes dependent on institutional memory rather than the document itself — the exact failure mode the entire documentation-first process was built to prevent.

---

# 13. Decisions Resolved Prior to Drafting

**Identifier: ARCH_PLAN:RESOLVED_DECISIONS**

The following decisions were identified as blocking in the previous version of this plan and have since been resolved by the Product Owner. They are recorded here so `03_SYSTEM_ARCHITECTURE.md` can be drafted against them directly, without re-deriving them from chat history.

1. **Multi-tenancy.** The architecture will be designed to be multi-tenant ready from day one, while Phase 1 implements and ships as single-tenant only. Concretely, this means: no architectural decision in `03_SYSTEM_ARCHITECTURE.md` may foreclose a future multi-tenant deployment; Phase 1 remains a single-store, self-hosted installation; tenant-isolation mechanisms must not add unnecessary complexity to the initial implementation; and the eventual transition to SaaS must be achievable as an extension of the architecture, not a redesign of it. This directly satisfies `ARCH_PLAN:ACCEPTANCE_CRITERIA` item 4 (no conflict with product direction) and must be reflected explicitly in the Domain Map and Data Ownership Principles sections of the architecture document — both should be drawn in a way that a tenant boundary could later be introduced without restructuring domain ownership.

2. **Non-functional requirements.** `03_SYSTEM_ARCHITECTURE.md` will not state capacity figures. It will instead state NFR *principles* — for example horizontal scalability, modularity, statelessness where appropriate, observability, fault tolerance, upgradeability, and maintainability — as architectural properties the system must exhibit, permanently housed as a dedicated section within `03_SYSTEM_ARCHITECTURE.md`. No new document is introduced into the roadmap for this purpose; the constitutional roadmap defined in `GOVERNANCE` §6 remains unchanged. The architecture must be written so that supplying concrete performance targets and capacity sizing later — wherever they are eventually specified — requires tuning within the already-stated principles, not architectural redesign.

3. **Hosting model.** Phase 1 officially targets self-hosted deployment. A future hosted or managed (SaaS) offering is permitted but must never become mandatory, and the architecture must not assume vendor-controlled infrastructure anywhere in its design. This is a direct, literal application of `VISION:NON_GOALS` and requires no further interpretation.

Two lower-severity items from the previous version of this plan remain as noted, not as blockers:

- **Extensibility mechanism** — `03_SYSTEM_ARCHITECTURE.md` will state the extensibility model at a principled level only (what is and is not permitted); the concrete mechanism is deferred to `04_MODULE_ARCHITECTURE.md`, as previously recommended.
- **Third-party integration architecture** — resolvable directly from `VISION:NON_GOALS` and `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` without further input; no open question remains.

---

# 14. Relationship to Other Documents

**Identifier: ARCH_PLAN:AUTHORITY**

This document is subordinate to `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, and `02_PRODUCT_PRINCIPLES`. It does not itself carry authority over any future document — it exists only to govern the drafting process of `03_SYSTEM_ARCHITECTURE.md` and may be superseded or retired once that document reaches Accepted status, at the Product Owner's discretion.

---

End of Document
