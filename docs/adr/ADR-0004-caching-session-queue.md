# ADR-0004: Caching, Session & Queue Backbone — Redis

| Field | Value |
|---|---|
| **Status** | Draft |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS`, `ARCH:NFR`, `ARCH:DEPLOYMENT_TOPOLOGY` |

## Context

`ADR-0001`'s modular monolith requires the Application Unit and Background Worker(s) to be stateless (`ARCH:NFR`) so that horizontal scaling and future multi-tenant separation are possible without redesign. This requires an external store for cache, session state, and the background job queue.

## Decision

Caching, session storage, and queue backbone: **Redis.**

## Alternatives Considered

- **Database-backed queue and session storage (using the primary datastore for all three roles).** Simpler operationally (one fewer service to run self-hosted) but couples background job throughput and session read/write volume to the primary datastore's load, working against `ARCH:NFR`'s fault-tolerance and scalability principles. Rejected for that reason, though it remains a documented fallback for the smallest self-hosted installations if a future document determines the added operational complexity of Redis is not justified at the smallest scale — that determination is out of scope for this ADR.

## Consequences

- Self-hosted installations now require running Redis alongside the primary datastore, a small increase in operational complexity weighed against the statelessness this provides.
- Session and cache state living outside the Application Unit is the specific mechanism that makes the Application Unit stateless per `ARCH:NFR` and `ARCH:DEPLOYMENT_TOPOLOGY`.
