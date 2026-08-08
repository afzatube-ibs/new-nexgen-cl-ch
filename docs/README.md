# neXgen Core — Documentation Index

This folder is the single source of truth for neXgen Core. Documents are authoritative in the order listed below — a lower-numbered document takes precedence over anything beneath it, and no document below it may contradict it.

## Foundation Documents

| # | Document | Status | Owner |
|---|----------|--------|-------|
| 00 | [PROJECT_GOVERNANCE](00_PROJECT_GOVERNANCE.md) | **Accepted (v1.6)** | Product & Solution Architect |
| 01 | [PRODUCT_VISION](01_PRODUCT_VISION.md) | **Accepted (v0.2)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| 02 | PRODUCT_PRINCIPLES | **Accepted (v1.0)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| — | [SYSTEM_ARCHITECTURE_PLAN](03_SYSTEM_ARCHITECTURE_PLAN.md) | Draft (v0.3) — closed out | Chief Software Architect & Lead Engineer |
| 03 | [SYSTEM_ARCHITECTURE](03_SYSTEM_ARCHITECTURE.md) | **Accepted (v1.2)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| — | [ADR-0001](adr/ADR-0001-modular-monolith.md), [0002](adr/ADR-0002-backend-runtime.md), [0003](adr/ADR-0003-primary-datastore.md), [0004](adr/ADR-0004-caching-session-queue.md), [0005](adr/ADR-0005-admin-interface.md), [0006](adr/ADR-0006-storefront-rendering.md), [0007](adr/ADR-0007-api-style.md), [0008](adr/ADR-0008-containerized-deployment.md), [0009](adr/ADR-0009-frontend-monorepo.md) | **Accepted** | Chief Software Architect & Lead Engineer (Product Owner confirmed) |
| 04 | [MODULE_ARCHITECTURE](04_MODULE_ARCHITECTURE.md) | **Accepted (v1.1)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| 05 | [DATA_ARCHITECTURE](05_DATA_ARCHITECTURE.md) | **Accepted (v1.0)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| 06 | [API_STANDARD](06_API_STANDARD.md) | **Accepted (v1.0)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| 07 | [UI_DESIGN_SYSTEM](07_UI_DESIGN_SYSTEM.md) | **Accepted (v1.0)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| 08 | [SECURITY_STANDARD](08_SECURITY_STANDARD.md) | **Accepted (v1.0)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| 09 | [ENGINEERING_STANDARD](09_ENGINEERING_STANDARD.md) | **Accepted (v1.0)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| 10 | [TESTING_STANDARD](10_TESTING_STANDARD.md) | **Accepted (v1.1)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |
| 11 | [DEPLOYMENT_STANDARD](11_DEPLOYMENT_STANDARD.md) | **Accepted (v1.0)** | Chief Software Architect & Lead Engineer (independently reviewed by Product & Solution Architect) |

Update this table's Status column every time a document changes state (Draft → Under Review → Accepted → Superseded), per the Document Lifecycle defined in `00_PROJECT_GOVERNANCE.md` (GOVERNANCE:DOCUMENT_LIFECYCLE).

## Subdirectories

- **`adr/`** — Architecture Decision Records. One file per decision (e.g. `ADR-0001-modular-monolith.md`). Indexed by status (Proposed / Accepted / Superseded / Deprecated) once ADRs exist.
- **`decisions/`** — Non-architectural project decisions worth recording permanently, that don't warrant a full ADR.
- **`diagrams/`** — Domain maps, ERDs, sequence diagrams, and other visual architecture references.
- **`assets/`** — Supporting files referenced by documents in this folder.
- **`frontend/`** — Phase 2.0's frontend architecture and design specification set (design system, admin shell, theme engine, storefront component engine, CMS foundation, performance foundation) — the concrete, framework-specific implementation companion to `07_UI_DESIGN_SYSTEM.md` and `ADR-0005`/`0006`/`0009`. See `frontend/README.md` for the reading order. Architecture only as of Phase 2.0 — no frontend code exists in this repository yet.
- **`operations/`** — Phase 1.1's operational runbooks (production deployment, day-2 operations, upgrades, disaster recovery, troubleshooting) for the backend.

## Rules

- No document is authoritative until its Status is **Accepted**.
- No document may be silently modified once Accepted — see `00_PROJECT_GOVERNANCE.md` (`GOVERNANCE:CHANGE_MANAGEMENT`).
- Every document must be self-contained: understandable by a contributor with no access to prior discussion. See `00_PROJECT_GOVERNANCE.md` (`GOVERNANCE:SELF_CONTAINED_DOCUMENTATION`).
- Cross-document references use stable identifiers (e.g. `VISION:MISSION`, `GOVERNANCE:DECISION_AUTHORITY`), not section numbers.
