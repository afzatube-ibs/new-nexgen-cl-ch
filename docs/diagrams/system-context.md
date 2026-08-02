# System Context Diagram

Referenced by `03_SYSTEM_ARCHITECTURE.md` § System Context (`ARCH:SYSTEM_CONTEXT`).

```mermaid
graph TB
    Merchant["Merchant / Staff\n(Operator)"]
    Customer["Customer"]

    subgraph System["neXgen Core"]
        Core["neXgen Core\n(single system boundary)"]
    end

    Payment["Payment Processors"]
    Carrier["Shipping / Courier Carriers"]
    Notify["Email / Notification Providers"]
    Supplier["Supplier Systems\n(future integration)"]

    Merchant -->|"manages store, catalog,\norders, fulfillment"| Core
    Customer -->|"browses, purchases,\ntracks orders"| Core
    Core -->|"charges, refunds"| Payment
    Core -->|"labels, tracking,\nrates"| Carrier
    Core -->|"transactional email,\nnotifications"| Notify
    Core -.->|"future: PO sync,\nsettlement"| Supplier
```

No internal structure is shown here — the system is a single box. Internal domain structure is defined in the Domain Map diagram.
