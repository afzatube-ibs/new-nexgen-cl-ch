# Cross-Domain Communication Flow

Referenced by `03_SYSTEM_ARCHITECTURE.md` § Cross-Domain Communication (`ARCH:CROSS_DOMAIN_COMMUNICATION`).

Illustrative example: a customer places an order, and Inventory (Commerce) and Fulfillment (Operations) both need to react, without either domain reaching into the other's data directly.

```mermaid
sequenceDiagram
    participant Customer
    participant Checkout as Commerce: Checkout
    participant Orders as Commerce: Orders
    participant Bus as Domain Event Bus
    participant Inventory as Commerce: Inventory
    participant Fulfillment as Operations: Fulfillment

    Customer->>Checkout: Complete purchase
    Checkout->>Orders: Create order (within Commerce, direct call)
    Orders->>Bus: Publish "OrderPlaced" event
    Bus-->>Inventory: OrderPlaced
    Bus-->>Fulfillment: OrderPlaced
    Inventory->>Inventory: Decrement stock (owns its own data)
    Fulfillment->>Fulfillment: Create fulfillment task (owns its own data)
```

Within a domain, direct calls are permitted (Checkout calling Orders — both Commerce). Across domains, only events are used. No domain queries or writes another domain's underlying data store directly — this is the mechanism satisfying `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`.
