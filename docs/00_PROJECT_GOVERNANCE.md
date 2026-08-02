# neXgen Core
## 00_PROJECT_GOVERNANCE

| Field | Value |
|---|---|
| **Title** | Project Governance |
| **Document ID** | GOVERNANCE |
| **Version** | 1.6 |
| **Status** | Accepted |
| **Author** | Product & Solution Architect |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | None (root document) |
| **Related Documents** | 01_PRODUCT_VISION |
| **Applies To** | All neXgen Core documents, architecture, implementation, reviews, and future contributors |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | — | Initial draft | First governance draft covering roles, workflow, hierarchy, ADR process |
| 1.1 | 2026-08-01 | Restored two-track disagreement escalation (§4); restored ADR ownership split (§9); revised Technology Leakage into three tiers including Module Architecture (§10); added `GOVERNANCE:*` stable identifiers (§8); clarified Delivery Lifecycle (§5) vs. Document Lifecycle (§7) as distinct processes | Engineering review identified that v1.0 had silently dropped three previously-agreed governance rules |
| 1.2 | 2026-08-01 | Removed `ADR` as a standalone rung at the bottom of the Documentation Hierarchy (§6) and clarified that each ADR inherits the authority of the document it originates from; clarified what "Product Approval" means for Engineering ADRs vs. Product ADRs, consistent with the Track 1 / Track 2 model (§9); tied Change Management approval authority explicitly back to Section 4 instead of leaving it unspecified (§13) | Final pre-acceptance consistency review identified three remaining ambiguities before the document could be considered fully internally consistent |
| 1.2 (formal) | 2026-08-01 | Status formally confirmed as Accepted by Product Owner | Completed the Document Lifecycle defined in `GOVERNANCE:DOCUMENT_LIFECYCLE` |
| 1.3 | 2026-08-01 | Added `**Identifier:**` tags to the sections `GOVERNANCE:*` identifiers had already been referencing throughout the project (§3 Roles, §4 Decision Authority, §7 Document Lifecycle, §9 ADR Ownership, §10 Technology Leakage, §12 Self-Contained Documentation, §13 Change Management) — no content or policy change | Final consistency review across `00`–`03` and their ADRs found this document, despite establishing the stable-identifier convention, had never applied it to its own sections; every downstream citation of these identifiers had been assuming they existed |
| 1.4 | 2026-08-01 | Renamed the roadmap entry `05_DATABASE_ARCHITECTURE` to `05_DATA_ARCHITECTURE` in the Documentation Hierarchy (§6) | Product Owner decision: the document defines the platform's data architecture (ownership, aggregates, identity, lifecycle, consistency), not a specific database implementation — the name should reflect that scope |
| 1.5 | 2026-08-01 | Added `**Identifier:**` tags to every remaining untagged section (§1 Purpose, §2 Scope, §5 Delivery Lifecycle, §6 Documentation Hierarchy, §8 Stable Identifiers, §11 Launch Migration Policy, §14 Review Standards, §15 Engineering Principles, §16 Completion Rule) — no content or policy change | Discovered while drafting `09_ENGINEERING_STANDARD.md`, which needed to cite `GOVERNANCE:ENGINEERING_PRINCIPLES` directly: v1.3's identifier-tagging pass had closed the gap for sections already being cited elsewhere but left the remainder untagged. Closing it completely this time rather than continuing to find it piecemeal |
| 1.6 | 2026-08-01 | Fixed two errors in §8's own identifier examples: `ARCH:MODULAR_MONOLITH` (never actually created — `03_SYSTEM_ARCHITECTURE`'s real identifier is `ARCH:ARCHITECTURAL_STYLE`) and `ADR:0001` (inconsistent colon notation — every real ADR reference throughout the project uses hyphenated `ADR-0001`) | Final documentation audit across `00`–`11` found these examples, in the section that establishes the identifier convention itself, didn't match what the convention actually produced elsewhere |

---

# 1. Purpose

**Identifier: GOVERNANCE:PURPOSE**

This document defines how neXgen Core is designed, reviewed, approved, implemented, and evolved.

Its purpose is to ensure the platform remains consistent, maintainable, secure, and understandable throughout its lifetime.

This document governs the project itself, not the software features.

---

# 2. Scope

**Identifier: GOVERNANCE:SCOPE**

This governance applies to:

- Documentation
- Architecture
- Database design
- APIs
- UI
- Backend
- Frontend
- Testing
- Deployment
- Security
- Future contributors
- AI-assisted development

Every future document derives its authority from this document.

---

# 3. Team Roles

**Identifier: GOVERNANCE:ROLES**

## Product Owner

Responsible for:

- Product vision
- Business requirements
- Priorities
- Final approval
- Scope decisions

The Product Owner has final authority on product direction.

---

## Product & Solution Architect

Responsible for:

- Product architecture
- Domain model
- Module boundaries
- UX direction
- Database design
- Documentation
- Cross-document consistency
- Product QA

Responsibilities include drafting architecture documents and ensuring every proposal aligns with accepted product principles.

---

## Chief Software Architect & Lead Engineer

Responsible for:

- Engineering architecture
- Backend implementation
- Performance
- Security
- Scalability
- Database engineering
- Code quality
- Refactoring
- Technical reviews
- Production readiness

The Chief Software Architect may reject implementation proposals for engineering reasons.

---

# 4. Decision Authority

**Identifier: GOVERNANCE:DECISION_AUTHORITY**

Product decisions:

Product Owner

Architecture decisions:

Product & Solution Architect

Engineering decisions:

Chief Software Architect

## Disagreement Resolution

Disagreements are resolved through one of two tracks, depending on whether the disagreement affects product direction.

**Track 1 — Product-Impacting Disagreements**

Used when a disagreement between the Product & Solution Architect and the Chief Software Architect affects scope, business direction, user-facing behavior, or product trade-offs.

1. Both viewpoints are documented, including trade-offs.
2. The disagreement is escalated to the Product Owner.
3. The Product Owner makes the final decision.

**Track 2 — Pure Engineering Implementation Disagreements**

Used when a disagreement is purely technical and does not affect product direction (for example, a choice between two internally equivalent implementation approaches).

1. Both viewpoints are documented, including trade-offs.
2. The decision is resolved through an ADR with documented engineering rationale.
3. Escalation to the Product Owner is not required.

If there is doubt about which track applies, the disagreement defaults to Track 1.

---

# 5. Delivery Lifecycle

**Identifier: GOVERNANCE:DELIVERY_LIFECYCLE**

Every feature follows the same lifecycle.

Draft

↓

Engineering Review

↓

Product Approval

↓

Accepted

↓

Implementation

↓

Verification

↓

Release

Implementation never starts without an Accepted specification.

This lifecycle governs individual features and implementation work. It is distinct from the Document Lifecycle defined in Section 7, which governs the status of project documents themselves. A feature reaching "Accepted" under this lifecycle is not the same event as a document reaching "Accepted" under the Document Lifecycle, though a feature's specification must itself be an Accepted document before implementation can begin.

---

# 6. Documentation Hierarchy

**Identifier: GOVERNANCE:DOCUMENTATION_HIERARCHY**

Project documents are authoritative in this order:

00_PROJECT_GOVERNANCE

↓

01_PRODUCT_VISION

↓

02_PRODUCT_PRINCIPLES

↓

03_SYSTEM_ARCHITECTURE

↓

04_MODULE_ARCHITECTURE

↓

05_DATA_ARCHITECTURE

↓

06_API_STANDARD

↓

07_UI_DESIGN_SYSTEM

↓

08_SECURITY_STANDARD

↓

09_ENGINEERING_STANDARD

↓

10_TESTING_STANDARD

↓

11_DEPLOYMENT_STANDARD

A lower-level document must never contradict a higher-level document.

**ADRs are not a separate rung in this hierarchy.** Each ADR inherits the authority of the document it originates from. An ADR created during the drafting of `03_SYSTEM_ARCHITECTURE` is authoritative at the same level as `03_SYSTEM_ARCHITECTURE` itself — not subordinate to documents that come later in this list, such as `11_DEPLOYMENT_STANDARD`. An ADR must never contradict the document it originates from, or any document above that document in this hierarchy.

---

# 7. Document Lifecycle

**Identifier: GOVERNANCE:DOCUMENT_LIFECYCLE**

Every document exists in one of four states.

Draft

Under Review

Accepted

Superseded

Only Accepted documents may guide implementation.

Superseded documents remain archived for historical reference.

This lifecycle governs the status of a project document itself (e.g. this file, `01_PRODUCT_VISION`, `03_SYSTEM_ARCHITECTURE`). It is distinct from the Delivery Lifecycle defined in Section 5, which governs the status of individual features moving toward implementation.

---

# 8. Stable Identifiers

**Identifier: GOVERNANCE:STABLE_IDENTIFIERS**

Cross-document references use stable identifiers rather than section numbers.

Examples:

VISION:MISSION

VISION:NON_GOALS

PRINCIPLES:SECURITY_FIRST

ARCH:ARCHITECTURAL_STYLE

ADR-0001

GOVERNANCE:ROLES

GOVERNANCE:DECISION_AUTHORITY

GOVERNANCE:DOCUMENT_LIFECYCLE

Identifiers must remain stable even if documents are reorganized.

---

# 9. Architecture Decision Records (ADR)

Every significant architectural decision requires an ADR.

Each ADR contains:

- Title
- Status
- Context
- Decision
- Alternatives Considered
- Consequences

## ADR Ownership

**Identifier: GOVERNANCE:ADR_OWNERSHIP**

ADRs are owned by whichever role's authority the decision falls under, matching Section 4.

**Product ADRs** — drafted and owned by the Product & Solution Architect.

Examples: why a Commerce Operating System, why configuration over customization, why a given modular domain boundary, roadmap-level decisions.

**Engineering ADRs** — drafted and owned by the Chief Software Architect & Lead Engineer.

Examples: modular monolith vs. microservices, REST vs. GraphQL, authentication strategy, caching strategy, search strategy, queue strategy.

All ADRs, regardless of owner, follow the same review cycle: Draft → Engineering Review → Product Approval → Accepted. What "Product Approval" means differs by ADR type, consistent with the Track 1 / Track 2 model in Section 4:

- For a **Product ADR**, Product Approval is full business-judgment approval by the Product Owner — the same authority exercised over any product-direction decision.
- For an **Engineering ADR**, Product Approval is a lighter confirmation: the Product Owner (or, where delegated, the Product & Solution Architect) confirms the decision does not conflict with approved product direction. It is not a re-litigation of the technical decision itself, which was already settled through Engineering Review under Track 2.

This distinction exists so that Track 2's intent — resolving pure engineering disagreements without unnecessary Product Owner involvement — is not undone by requiring full product-level scrutiny of every Engineering ADR.

ADRs evolve with the project and provide historical reasoning for technical decisions.

---

# 10. Technology Leakage

**Identifier: GOVERNANCE:TECHNOLOGY_LEAKAGE**

Technology references are permitted only where appropriate to the document's purpose.

**Technology Independent** — must not reference specific technologies:

- Governance
- Product Vision
- Product Principles

**Mostly Technology Independent** — may describe structural concepts (domains, events, public interfaces, boundaries) but should avoid naming implementation-specific technologies unless a technology choice is itself the point being documented:

- Module Architecture

**Technology Specific** — technology references are expected and appropriate:

- System Architecture
- Database Architecture
- API Standard
- UI Design System
- Security Standard
- Engineering Standard
- Testing Standard
- Deployment Standard

Technology choices must never influence product vision.

---

# 11. Launch Migration Policy

**Identifier: GOVERNANCE:LAUNCH_MIGRATION_POLICY**

neXgen Launch and neXgen Core are separate projects.

Lessons learned from Launch may inform neXgen Core.

Code, database schema, architecture, naming, or implementation from Launch must never be adopted automatically.

Any reuse requires explicit review and approval.

Business knowledge transfers.

Implementation does not.

---

# 12. Self-Contained Documentation

**Identifier: GOVERNANCE:SELF_CONTAINED_DOCUMENTATION**

Every Accepted document must be understandable without external conversation history.

A contributor joining the project should be able to implement the documented behavior using only the Accepted documents.

If a document depends on chat history, it is incomplete.

---

# 13. Change Management

**Identifier: GOVERNANCE:CHANGE_MANAGEMENT**

Accepted documents are never modified silently.

Every change must:

- Be proposed
- Explain the reason
- Be reviewed
- Be approved
- Increment the document version

Approval authority for a change follows Section 4 (Decision Authority) — the same Track 1 / Track 2 model used for disagreement resolution applies here rather than a separate approval path: a change affecting product direction requires Product Owner approval; a change that is purely technical and does not affect product direction may be approved through Engineering Review and documented via ADR, without requiring separate Product Owner approval.

Significant architectural changes require a new ADR.

---

# 14. Review Standards

**Identifier: GOVERNANCE:REVIEW_STANDARDS**

Every document must satisfy:

- Correct scope
- Internal consistency
- Consistency with higher-level documents
- Stable references
- Appropriate technology abstraction
- Self-contained content
- Clear ownership
- Ready for implementation

---

# 15. Engineering Principles

**Identifier: GOVERNANCE:ENGINEERING_PRINCIPLES**

The project follows:

- Architecture before implementation
- Domain ownership
- Configuration over customization
- Security by default
- Single source of truth
- Explicit dependencies
- Backward compatibility where practical
- No undocumented behavior
- No temporary production code

---

# 16. Completion Rule

**Identifier: GOVERNANCE:COMPLETION_RULE**

A specification is complete only when:

- Product requirements are defined.
- Engineering review is complete.
- Product Owner approves.
- Document status is Accepted.

Only then may implementation begin.

---

End of Document
