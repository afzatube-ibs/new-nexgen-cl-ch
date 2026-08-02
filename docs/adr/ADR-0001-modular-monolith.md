# ADR-0001: Modular Monolith Architecture

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer (Engineering ADR, per `GOVERNANCE:ADR_OWNERSHIP`) |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:ARCHITECTURAL_STYLE` |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-01 | Drafted | Engineering Review complete; decision already reflected directly in the Accepted `03_SYSTEM_ARCHITECTURE.md` § `ARCH:ARCHITECTURAL_STYLE` |
| 2026-08-02 | Status changed to Accepted | Product Owner confirmed this Engineering ADR does not conflict with approved product direction, per `GOVERNANCE:ADR_OWNERSHIP`'s lighter-confirmation model for Engineering ADRs. Implementation of Platform Foundation (`04_MODULE_ARCHITECTURE.md` module 1) depends directly on this decision and cannot begin under `GOVERNANCE:COMPLETION_RULE` until it is Accepted |

## Context

`03_SYSTEM_ARCHITECTURE.md` must decide the platform's fundamental structural approach. The two realistic candidates are a modular monolith (one deployable application unit, internally divided into domain modules with enforced boundaries) and a distributed microservices architecture (each domain as an independently deployable service).

This decision must satisfy: `ARCH_PLAN:RESOLVED_DECISIONS` item 3 (Phase 1 targets self-hosted deployment, no vendor-controlled infrastructure assumed), item 1 (multi-tenant readiness without Phase 1 complexity), and `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` (the platform must be operable without requiring specialized infrastructure expertise).

## Decision

neXgen Core adopts a **modular monolith**: a single deployable backend application unit, internally organized into domains with enforced code-level boundaries (see `ARCH:DOMAIN_MAP`), communicating internally through defined interfaces and domain events rather than network calls.

## Alternatives Considered

- **Distributed microservices.** Rejected for Phase 1. A self-hosted merchant running a single store should not need to operate multiple independently deployed services, service discovery, or inter-service network reliability — this directly conflicts with `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` and the self-hosted-first hosting decision. Microservices also introduce distributed-transaction and eventual-consistency complexity that a single-store merchant gains no benefit from at Phase 1 scale.
- **Unstructured monolith (no enforced domain boundaries).** Rejected. Satisfies self-hosting simplicity but fails `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` and `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` — without enforced boundaries, domain logic and data ownership drift into ambiguity over time, which is precisely the "assembled, not built" failure mode `VISION:PROBLEM` describes in existing commerce tooling.

## Consequences

- A single application unit is simple to self-host, matching Phase 1's hosting decision.
- Domain boundaries must be enforced through code structure and review discipline (see `09_ENGINEERING_STANDARD.md`, not yet drafted), since there is no network boundary forcing the separation the way microservices would.
- Cross-domain communication must go through an abstraction (see `ARCH:CROSS_DOMAIN_COMMUNICATION`) designed so that a future move toward extracting a domain into its own service — should multi-tenant SaaS scale ever require it — is an extension of the existing interface, not a rewrite. This directly satisfies `ARCH_PLAN:RESOLVED_DECISIONS` item 1's requirement that the SaaS transition be an extension, not a redesign.
- If a specific domain's load genuinely cannot be served within the shared deployable unit at some future scale, this decision should be revisited — see `ARCH:RISKS`.
