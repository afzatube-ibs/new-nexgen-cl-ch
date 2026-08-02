# ADR-0006: Storefront Rendering — Next.js

| Field | Value |
|---|---|
| **Status** | Draft |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS` |

## Context

The customer-facing storefront has different requirements than the admin interface: it must be discoverable by search engines and perform well for anonymous, first-time visitors, which favors server-side or hybrid rendering over a purely client-rendered single-page application.

## Decision

Storefront rendering: **Next.js**, communicating with the backend exclusively through the REST API (`ADR-0007`), independently deployable from both the backend and the admin interface.

## Alternatives Considered

- **Client-side-only React application (same approach as the admin interface, `ADR-0005`).** Simpler to maintain as a single frontend pattern across both interfaces, but a purely client-rendered storefront has materially worse search-engine visibility and slower first-paint for anonymous customers, which is a direct cost to `PRINCIPLES:MERCHANT_FIRST` — the merchant's ability to be found and to convert visitors is a core operational need, not a developer convenience. Rejected.
- **Server-rendered storefront directly from the backend framework (same coupling concern as `ADR-0005`).** Rejected for the same modular-boundary reasoning as the admin interface decision.

## Consequences

- The storefront and admin interface use different frontend approaches for reasons specific to their respective audiences and needs — this is a deliberate exception to `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`, justified because storefront and admin have genuinely different non-functional requirements (public discoverability vs. authenticated operator efficiency), not because a new pattern "felt more natural."
- Both frontends depend on the same REST API (`ADR-0007`), which is the actual point of consistency enforced across the platform.
