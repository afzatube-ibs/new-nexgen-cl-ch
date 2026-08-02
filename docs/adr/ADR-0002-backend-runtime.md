# ADR-0002: Backend Runtime — PHP / Laravel

| Field | Value |
|---|---|
| **Status** | Draft |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS`, `ADR-0001` |

## Context

The modular monolith (`ADR-0001`) needs a backend runtime capable of enforcing internal domain boundaries, supporting self-hosted deployment without specialized operational expertise, and mature enough to support long-term maintainability (`PRINCIPLES:PREDICTABLE_UPGRADES`, `VISION:PLATFORM_PROMISES`).

## Decision

Backend runtime: **PHP 8.4+, using the Laravel framework (current stable major version at implementation time).**

## Alternatives Considered

- **Node.js / TypeScript backend.** Considered for stack consistency with the frontend layer. Rejected as the sole backend runtime because PHP's hosting ecosystem is broader and simpler for the self-hosted, shared-hosting-friendly deployment model this platform targets, directly supporting `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` and the self-hosted-first hosting decision.
- **Go or another compiled backend.** Rejected for Phase 1 — offers performance headroom not currently justified by any stated NFR target (none exist beyond principles, per `ARCH_PLAN:RESOLVED_DECISIONS` item 2), at the cost of a smaller pool of contributors familiar with commerce-domain patterns in that ecosystem.

## Consequences

- Business logic is expressed in PHP; the domain boundary enforcement described in `ADR-0001` is a code-organization and code-review discipline, not a language-level guarantee — this will need to be reflected in `09_ENGINEERING_STANDARD.md`.
- The REST API (`ADR-0007`) is the seam that keeps this decision reversible in principle — the storefront and admin interfaces interact with the backend only through the API, satisfying `VISION:DECISION_FILTER` question 5 (capability preserved even if this specific technology were replaced).
