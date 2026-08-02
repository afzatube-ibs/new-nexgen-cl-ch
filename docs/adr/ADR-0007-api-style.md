# ADR-0007: API Style — REST, OpenAPI-Documented

| Field | Value |
|---|---|
| **Status** | Draft |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS`, `ADR-0002`, `ADR-0005`, `ADR-0006` |

## Context

Both frontends (`ADR-0005`, `ADR-0006`) and any future third-party integration depend on a single, documented API surface. `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` and `GOVERNANCE §12` (self-contained documentation) both bear on this decision — the API must be understandable and usable without institutional knowledge.

## Decision

API style: **REST, formally documented using the OpenAPI specification**, versioned explicitly (versioning scheme to be detailed in `06_API_STANDARD.md`).

## Alternatives Considered

- **GraphQL.** Offers flexible client-driven queries, which could benefit two independently-evolving frontends. Rejected for Phase 1: REST with OpenAPI is more broadly understood by third-party integrators (relevant given `VISION:NON_GOALS` rejects vendor lock-in, which implies third parties should be able to integrate without unusual tooling), and OpenAPI's schema-first documentation directly satisfies the self-contained documentation requirement in a way that is simpler to enforce consistently across a growing API surface.

## Consequences

- Every API capability must have a corresponding OpenAPI schema entry — this becomes an enforceable requirement in `06_API_STANDARD.md` and a review-checklist item once that document exists.
- This decision is the mechanism that keeps `ADR-0002` (backend runtime) reversible in principle: as long as the REST contract is preserved, the backend implementation language could theoretically change without requiring either frontend to change, satisfying `VISION:DECISION_FILTER` question 5.
