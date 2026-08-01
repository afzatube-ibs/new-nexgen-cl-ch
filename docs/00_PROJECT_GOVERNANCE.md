# neXgen Core
## 00_PROJECT_GOVERNANCE

| Field | Value |
|---|---|
| **Title** | Project Governance |
| **Document ID** | GOVERNANCE |
| **Version** | 1.1 |
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

---

# 1. Purpose

This document defines how neXgen Core is designed, reviewed, approved, implemented, and evolved.

Its purpose is to ensure the platform remains consistent, maintainable, secure, and understandable throughout its lifetime.

This document governs the project itself, not the software features.

---

# 2. Scope

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

05_DATABASE_ARCHITECTURE

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

↓

ADR

A lower-level document must never contradict a higher-level document.

---

# 7. Document Lifecycle

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

Cross-document references use stable identifiers rather than section numbers.

Examples:

VISION:MISSION

VISION:NON_GOALS

PRINCIPLES:SECURITY_FIRST

ARCH:MODULAR_MONOLITH

ADR:0001

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

ADRs are owned by whichever role's authority the decision falls under, matching Section 4.

**Product ADRs** — drafted and owned by the Product & Solution Architect.

Examples: why a Commerce Operating System, why configuration over customization, why a given modular domain boundary, roadmap-level decisions.

**Engineering ADRs** — drafted and owned by the Chief Software Architect & Lead Engineer.

Examples: modular monolith vs. microservices, REST vs. GraphQL, authentication strategy, caching strategy, search strategy, queue strategy.

All ADRs, regardless of owner, follow the same review cycle: Draft → Engineering Review → Product Approval → Accepted.

ADRs evolve with the project and provide historical reasoning for technical decisions.

---

# 10. Technology Leakage

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

neXgen Launch and neXgen Core are separate projects.

Lessons learned from Launch may inform neXgen Core.

Code, database schema, architecture, naming, or implementation from Launch must never be adopted automatically.

Any reuse requires explicit review and approval.

Business knowledge transfers.

Implementation does not.

---

# 12. Self-Contained Documentation

Every Accepted document must be understandable without external conversation history.

A contributor joining the project should be able to implement the documented behavior using only the Accepted documents.

If a document depends on chat history, it is incomplete.

---

# 13. Change Management

Accepted documents are never modified silently.

Every change must:

- Be proposed
- Explain the reason
- Be reviewed
- Be approved
- Increment the document version

Significant architectural changes require a new ADR.

---

# 14. Review Standards

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

A specification is complete only when:

- Product requirements are defined.
- Engineering review is complete.
- Product Owner approves.
- Document status is Accepted.

Only then may implementation begin.

---

End of Document
