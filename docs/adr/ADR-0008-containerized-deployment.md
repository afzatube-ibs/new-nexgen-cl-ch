# ADR-0008: Local & Self-Hosted Deployment Packaging — Docker

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS`, `ARCH:DEPLOYMENT_TOPOLOGY` |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-01 | Drafted | Engineering Review complete |
| 2026-08-02 | Status changed to Accepted | Product Owner confirmed this Engineering ADR does not conflict with approved product direction, per `GOVERNANCE:ADR_OWNERSHIP`. Platform Foundation implementation depends directly on this decision and cannot begin under `GOVERNANCE:COMPLETION_RULE` until it is Accepted |

## Context

`ARCH_PLAN:RESOLVED_DECISIONS` item 3 requires Phase 1 to target self-hosted deployment without assuming vendor-controlled infrastructure. Merchants and operators self-hosting the platform need a consistent, reproducible way to run the Application Unit, Background Worker(s), datastore, and cache together, without requiring them to individually install and configure each dependency's runtime.

## Decision

Local development and self-hosted deployment packaging: **Docker**, packaging each conceptual component from `ARCH:DEPLOYMENT_TOPOLOGY` (Application Unit, Background Worker, datastore, cache) as a runnable container, with no specific orchestration platform (e.g. Kubernetes) assumed or required at this level — orchestration choices belong in `11_DEPLOYMENT_STANDARD.md`, not here.

## Alternatives Considered

- **No containerization; document manual installation steps per operating system.** Rejected — this would materially increase the operational burden on merchants self-hosting the platform, directly working against `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`, and would multiply the surface area `09_ENGINEERING_STANDARD.md` and `11_DEPLOYMENT_STANDARD.md` would need to support and test against.

## Consequences

- Docker becomes a baseline expectation for self-hosting the platform; this should be reflected in `11_DEPLOYMENT_STANDARD.md`.
- Container packaging does not by itself decide orchestration for larger or future SaaS-style deployments — that remains open and appropriately deferred, consistent with `ARCH_PLAN:OUT_OF_SCOPE`.
