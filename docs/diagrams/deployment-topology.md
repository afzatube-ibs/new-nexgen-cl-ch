# Conceptual Deployment Topology

Referenced by `03_SYSTEM_ARCHITECTURE.md` § Deployment Topology (`ARCH:DEPLOYMENT_TOPOLOGY`).

Shape only — no orchestration tooling or infrastructure-as-code specifics. Those belong in `11_DEPLOYMENT_STANDARD.md`.

```mermaid
graph TB
    subgraph Install["A Single neXgen Core Installation (self-hosted, Phase 1)"]
        App["Application Unit\n(handles web requests)"]
        Worker["Background Worker(s)\n(processes queued jobs)"]
        Cache["Cache / Session / Queue Store"]
        DB["Primary Datastore"]
        Storefront["Storefront Build\n(customer-facing)"]
        Admin["Admin Build\n(operator-facing)"]
    end

    Storefront -->|"REST API"| App
    Admin -->|"REST API"| App
    App --> Cache
    App --> DB
    Worker --> Cache
    Worker --> DB
```

The Application Unit and Background Worker(s) are stateless and can be run as multiple instances if the merchant's scale requires it, since all shared state lives in the Cache/Session/Queue store and the Datastore — this is what makes the system horizontally scalable per `ARCH:NFR`. A single-installation deployment is one tenant; the same shape supports a future multi-tenant deployment without structural change, per `ARCH_PLAN:RESOLVED_DECISIONS` item 1.
