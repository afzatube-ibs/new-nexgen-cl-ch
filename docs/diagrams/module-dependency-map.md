# Module Dependency Map

Referenced by `04_MODULE_ARCHITECTURE.md` § Cross-Module Interaction Rules (`MODULE:INTERACTION_RULES`).

Solid arrows = allowed direct dependency (same domain, or any module depending on Platform). Dashed arrows = cross-domain, event-only interaction (`ARCH:CROSS_DOMAIN_COMMUNICATION`). No arrow = no dependency permitted.

```mermaid
graph TB
    subgraph Platform
        IA[Identity & Access]
        SC[Store Configuration]
        SE[Settings]
        MD[Media]
        EX[Extensibility]
    end

    subgraph Commerce
        CAT[Catalog]
        INV[Inventory]
        PRI[Pricing]
        PRO[Promotions]
        ORD[Orders]
        CHK[Checkout]
    end

    subgraph Operations
        SHP[Shipping]
        FUL[Fulfillment]
        RET[Returns]
        SUP[Supplier Management]
    end

    subgraph Growth
        REP[Reporting]
        CRM[CRM]
        MKT[Marketing]
        AUT[Automation]
    end

    CHK --> ORD
    CHK --> PRI
    CHK --> PRO
    ORD --> INV
    PRO --> CAT

    Commerce -.->|events| Operations
    Commerce -.->|events, read-only| Growth
    Operations -.->|events, read-only| Growth

    Platform --> Commerce
    Platform --> Operations
    Platform --> Growth
```

Within-domain arrows shown are illustrative, not exhaustive — the binding rule is stated in `MODULE:COUPLING_RULES`, not this diagram. Growth has no outgoing arrows into Commerce or Operations: it is never depended upon by either, consistent with `ARCH:DOMAIN_MAP`.
