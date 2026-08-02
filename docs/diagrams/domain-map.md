# Domain Map

Referenced by `03_SYSTEM_ARCHITECTURE.md` § Domain Map (`ARCH:DOMAIN_MAP`).

Domains only — no modules, no tables, no endpoints. Module-level detail belongs in `04_MODULE_ARCHITECTURE.md`.

```mermaid
graph TB
    subgraph Platform["Platform Domain"]
        P["Identity & Access, Store Configuration,\nSettings, Media, Extensibility"]
    end

    subgraph Commerce["Commerce Domain"]
        C["Catalog, Inventory, Pricing,\nPromotions, Orders, Checkout"]
    end

    subgraph Operations["Operations Domain"]
        O["Shipping, Fulfillment,\nReturns, Supplier Management"]
    end

    subgraph Growth["Growth Domain\n(designed for, not built in Phase 1)"]
        G["Reporting, CRM,\nMarketing, Automation"]
    end

    Platform -->|"underlies"| Commerce
    Platform -->|"underlies"| Operations
    Platform -->|"underlies"| Growth
    Commerce -->|"domain events\n(e.g. order placed)"| Operations
    Commerce -.->|"domain events\n(read-only insight)"| Growth
    Operations -.->|"domain events\n(read-only insight)"| Growth
```

Platform is the only domain every other domain depends on directly. Commerce and Operations communicate through domain events, not direct calls into each other's data. Growth consumes events from Commerce and Operations but is not depended upon by either — consistent with it being designed-for, not built, in Phase 1.
