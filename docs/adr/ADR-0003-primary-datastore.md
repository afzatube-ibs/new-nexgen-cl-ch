# ADR-0003: Primary Datastore — MySQL

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS`, `ARCH:DATA_OWNERSHIP` |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-01 | Drafted | Engineering Review complete |
| 2026-08-02 | Status changed to Accepted | Product Owner confirmed this Engineering ADR does not conflict with approved product direction, per `GOVERNANCE:ADR_OWNERSHIP`. Platform Foundation implementation depends directly on this decision and cannot begin under `GOVERNANCE:COMPLETION_RULE` until it is Accepted |

## Context

The platform needs a primary relational datastore that supports self-hosted deployment without specialized database administration expertise, is widely supported by low-cost hosting, and can support the data-ownership boundaries described in `ARCH:DATA_OWNERSHIP` (including future tenant-scoping without redesign, per `ARCH_PLAN:RESOLVED_DECISIONS` item 1).

## Decision

Primary datastore: **MySQL 8+.**

## Alternatives Considered

- **PostgreSQL.** A strong alternative with arguably richer feature set for complex constraints. Not chosen over MySQL primarily on the basis of self-hosted operational familiarity and hosting-provider ubiquity, which more directly serves `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` for the platform's Phase 1 audience (independent merchants and growing businesses, per `VISION:AUDIENCE`, who are more likely to have access to low-cost MySQL-compatible hosting).
- **A document/NoSQL store.** Rejected — commerce data (orders, inventory, pricing) is fundamentally relational, and `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` depends on the referential integrity a relational store enforces natively.

## Consequences

- Domain-owned data (`ARCH:DATA_OWNERSHIP`) will live in MySQL, with future tenant-scoping designed in at the schema level (to be detailed in `05_DATABASE_ARCHITECTURE.md`) without being exercised in Phase 1.
- Choice of MySQL does not by itself satisfy horizontal scalability (`ARCH:NFR`) — that depends on how the schema and connection strategy are designed in `05_DATABASE_ARCHITECTURE.md`, which inherits this decision as a constraint.
