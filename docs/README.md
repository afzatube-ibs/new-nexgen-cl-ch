# neXgen Core — Documentation Index

This folder is the single source of truth for neXgen Core. Documents are authoritative in the order listed below — a lower-numbered document takes precedence over anything beneath it, and no document below it may contradict it.

## Foundation Documents

| # | Document | Status | Owner |
|---|----------|--------|-------|
| 00 | [PROJECT_GOVERNANCE](00_PROJECT_GOVERNANCE.md) | Accepted (v1.1) | Product Owner |
| 01 | [PRODUCT_VISION](01_PRODUCT_VISION.md) | Draft (v0.1) — pending independent review | Product & Solution Architect |
| 02 | PRODUCT_PRINCIPLES | Not started | Product & Solution Architect |
| 03 | SYSTEM_ARCHITECTURE | Not started | Product & Solution Architect |
| 04 | MODULE_ARCHITECTURE | Not started | Product & Solution Architect |
| 05 | DATABASE_ARCHITECTURE | Not started | Product & Solution Architect |
| 06 | API_STANDARD | Not started | Chief Software Architect |
| 07 | UI_DESIGN_SYSTEM | Not started | Product & Solution Architect |
| 08 | SECURITY_STANDARD | Not started | Chief Software Architect |
| 09 | ENGINEERING_STANDARD | Not started | Chief Software Architect |
| 10 | TESTING_STANDARD | Not started | Chief Software Architect |
| 11 | DEPLOYMENT_STANDARD | Not started | Chief Software Architect |

Update this table's Status column every time a document changes state (Draft → Under Review → Accepted → Superseded), per the Document Lifecycle defined in `00_PROJECT_GOVERNANCE.md` (GOVERNANCE:DOCUMENT_LIFECYCLE).

## Subdirectories

- **`adr/`** — Architecture Decision Records. One file per decision (e.g. `ADR-0001-modular-monolith.md`). Indexed by status (Proposed / Accepted / Superseded / Deprecated) once ADRs exist.
- **`decisions/`** — Non-architectural project decisions worth recording permanently, that don't warrant a full ADR.
- **`diagrams/`** — Domain maps, ERDs, sequence diagrams, and other visual architecture references.
- **`assets/`** — Supporting files referenced by documents in this folder.

## Rules

- No document is authoritative until its Status is **Accepted**.
- No document may be silently modified once Accepted — see `00_PROJECT_GOVERNANCE.md` §13 (Change Management).
- Every document must be self-contained: understandable by a contributor with no access to prior discussion. See `00_PROJECT_GOVERNANCE.md` §12.
- Cross-document references use stable identifiers (e.g. `VISION:MISSION`, `GOVERNANCE:DECISION_AUTHORITY`), not section numbers.
