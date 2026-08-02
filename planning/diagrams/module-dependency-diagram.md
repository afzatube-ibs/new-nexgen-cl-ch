# Implementation Master Plan — Module Dependency Diagram

Referenced by `IMPLEMENTATION_MASTER_PLAN.md` Part 3.

```mermaid
graph TB
    PF[Platform Foundation]
    IA[Identity & Access]
    OS[Organizations & Stores]
    MD[Media]
    LC[Localization & Currency]
    INS[Installer]

    PF --> IA
    PF --> OS
    IA --> OS
    OS --> MD
    OS --> LC
    PF --> INS
    IA --> INS
    OS --> INS

    CUS[Customers]
    CAT[Catalog]
    PRC[Pricing & Tax]
    PRO[Promotions & Coupons]
    INV[Inventory & Multi-Warehouse]
    ORD[Orders]
    CHK[Checkout]
    PAY[Payments]

    IA --> CUS
    MD --> CAT
    CAT --> PRC
    LC --> PRC
    CAT --> PRO
    PRC --> PRO
    CAT --> INV
    CAT --> CHK
    INV --> CHK
    PRC --> CHK
    PRO --> CHK
    CHK --> ORD
    ORD --> PAY

    SHP[Shipping & Logistics]
    FUL[Fulfillment]
    RET[Returns Exchanges Refunds]
    SUP[Suppliers PO Stock Transfer]

    ORD -.->|event| FUL
    SHP --> FUL
    INV --> FUL
    ORD -.->|event| RET
    FUL -.->|event| RET
    PAY --> RET
    INV --> SUP

    CRM[CRM]
    RPT[Reporting]
    SRC[Search]

    CUS -.->|event| CRM
    ORD -.->|event| CRM
    RET -.->|event| CRM
    CAT -.->|event| SRC
    CAT -.->|event| RPT
    ORD -.->|event| RPT
```

Solid arrows are direct same-domain dependencies or explicit build-order prerequisites. Dashed arrows are event-based cross-domain reactions, per `ARCH:CROSS_DOMAIN_COMMUNICATION` — the receiving module is never blocked waiting on the publisher, and never depended upon in reverse.

Not shown for clarity: Content & Discovery, Communication, and Platform Interface modules, all of which depend on Catalog/Orders/Customers existing first but do not participate in Commerce's core transaction path.
