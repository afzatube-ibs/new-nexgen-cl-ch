# ADR-0005: Admin Interface — React + TypeScript

| Field | Value |
|---|---|
| **Status** | Draft |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS` |

## Context

`PRINCIPLES:OPERATIONAL_ACCESSIBILITY` requires that operators can perform common tasks through the platform's own interface. The admin interface is a distinct application from the customer-facing storefront (`ADR-0006`), interacting with the backend only through the REST API (`ADR-0007`), consistent with `ADR-0001`'s modular boundary between backend and frontend concerns.

## Decision

Admin interface: **React with TypeScript**, communicating with the backend exclusively through the REST API.

## Alternatives Considered

- **Server-rendered admin views (generated directly by the backend framework).** Simpler initially, but tightly couples the admin interface's release cycle to the backend's, working against the modular boundary `ADR-0001` establishes and making the admin interface harder to iterate on independently. Rejected.

## Consequences

- TypeScript's static typing supports `PRINCIPLES:EXPLICIT_FAILURE` at the interface layer — type errors surface at build time rather than as runtime failures encountered by an operator.
- The admin interface has no direct access to the datastore or any backend-internal state; every capability it offers an operator must exist as a documented API capability (`ADR-0007`), which is itself a forcing function for `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` and the later `06_API_STANDARD.md`.
