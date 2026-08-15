# Phase 2.6 — Orders: Architecture & Readiness Research

**Date:** 2026-08-15
**Status:** Research only. No frontend or backend code written. No schema/route/permission changes.
**Scope of this document:** what the real, already-complete Orders backend (`apps/backend/app/Domains/Commerce/Orders/`) actually supports, read directly from source — Models, Controllers, Actions, Requests, Resources, Routes, Permissions, Events, Audit, and existing tests — plus its confirmed relationships to Checkout, Customers, Fulfillment, and Payments. No business logic or API contract is invented anywhere in this document.

---

## 1. Backend Readiness

**Orders is a real, complete, already-in-production backend module** — not a stub. Every screen this document proposes is backed by a real, already-tested endpoint.

| Area | Status |
|---|---|
| Model (`Order` + 5 child models) | Complete — `Order`, `OrderItem`, `OrderAddress`, `OrderDiscount`, `OrderNote`, `OrderTimelineEvent` |
| Controllers | Complete — `OrderController` (index/show/store), `OrderStatusController` (5 transitions), `OrderNoteController` (store), `AuditLogController` (index) |
| Actions | Complete — `CreateOrderAction`, `ConfirmOrderAction`, `StartProcessingOrderAction`, `ShipOrderAction`, `DeliverOrderAction`, `CancelOrderAction`, `AddOrderNoteAction` |
| Requests | Complete — full validation on create, cancel, note; a shared `ExpectedVersionRequest` for the four version-only transitions |
| Resources | Complete — `OrderResource` (+ 5 nested resources), `AuditLogResource` |
| Routes | Complete — 10 endpoints under `api/v1`, all `auth:sanctum` + `permission:` gated |
| Permissions | Complete, dedicated 4-key registry (`orders.orders.view`/`.manage`, `orders.notes.manage`, `orders.audit_log.view`) — separate from every other module's keys |
| Events | Complete — `OrderPlaced` (2 real subscribers), `OrderStatusChanged` (0 subscribers today, a named gap below) |
| Audit | Complete — every action logs via `Orders\Audit\AuditLogger`, same `target_type`/`actor_id`-only filter shape as Customers' own audit endpoint (no `target_id` filter) |
| Existing tests | `AuditLogTest`, `OrderManagementTest`, `OrderNoteTest`, `OrderStatusTest` (Feature); `PermissionRegistryTest`, `HasOptimisticLockingTest`, `OrderStatusTransitionTest` (Unit) — confirms the module already has its own regression coverage independent of any frontend |

**Readiness score: 9/10.** The one point held back is not a gap in what exists — it is that Orders is deliberately narrower than a full order-management system by design (no refunds, no shipment tracking detail, no order creation UI intended — see §6), and a frontend slice needs an explicit Product Owner decision on how honestly to represent that narrowness rather than build around it silently.

## 2. Existing Capabilities (read directly from source, not assumed)

### 2.1 Order Status Lifecycle

A one-directional graph with a single early exit, enforced server-side in `Order::canTransitionTo()` — every illegal transition is rejected with a real `422` (`InvalidOrderStatusTransitionException`), not a frontend guess:

```
pending → confirmed → processing → shipped → delivered
   \            \            /
    ------------> cancelled
```

`delivered` and `cancelled` are terminal (`Order::isTerminal()`). Five real endpoints, each a dedicated business action (not a generic status-update endpoint): `confirm`, `start-processing`, `ship`, `deliver`, `cancel` (the only one requiring a `reason`, `max:1000`). All five are `expected_version`-gated — the identical `HasOptimisticLocking` pattern (`assertVersionMatches()`) every other module in this platform already uses, producing a real `409` (`ConcurrencyConflictException`) on a stale write.

**Refunds are explicitly out of scope for this module by design** — confirmed via `Order.php`'s own docblock: "Refunds are deliberately out of scope... this status graph does not invent a `refunded` state." (Returns/Refunds is a separate, already-built module — `MODULE:RETURNS` — that reaches Orders only through its own independent aggregates, never through Order's own status field.)

### 2.2 Order Creation

`POST /orders` (`orders.orders.manage`) is a real, callable endpoint — but its own `CreateOrderRequest` docblock and `OrderController`'s own class docblock both state the intended creation path explicitly: **"Order CRUD (create via Checkout only)."** Confirmed by tracing the real call graph: `Checkout\Actions\SubmitCheckoutAction` calls `CreateOrderAction::execute()` directly. `CreateOrderAction` is the one place this module reads Customers' live data — exactly once, to freeze a `Customer`'s `name`/`email`/`phone` into the Order's own snapshot columns, per its own docblock: "records the outcome... never recalculates independently." Every price, discount, and tax figure arrives already resolved from the caller (Checkout) — Orders performs no pricing calculation of its own, only bcmath summation into totals.

Input shape (from `CreateOrderRequest`): `customer_id` (must reference a real Customer, `exists:customers,id`), `currency_code` (validated against the real Localization ISO 4217 list), `items[]` (product_id/sku/product_name/quantity/unit_price/discount_amount/tax_amount), `billing_address`/`shipping_address` (either `address_id` from the customer's own address book, or a full inline address — resolved into an immutable snapshot either way, never a live reference), optional `discounts[]`, optional `shipping_total`.

**A real, load-bearing admin capability exists here even though the endpoint's primary path is Checkout**: because the route is permission-gated (not blocked for staff), an authorized admin *could* place an order manually through this same endpoint — a genuine "phone order" / "manual order entry" merchant workflow this backend already supports without any new code. This is a real Product Owner decision point, not an invented feature — see §6.

### 2.3 Order Read Access

`GET /orders` (`orders.orders.view`) — genuinely server-side `status`, `customer_id`, and a real free-text `q` (matches `order_number`/`customer_name`/`customer_email` via `LIKE`, confirmed a plain in-module filter, not routed through the platform's own Search module — Order search was deliberately scoped this way per `MODULE:SEARCH`'s own accepted boundary). **Hardcoded `orderByDesc('placed_at')`** — no server-side sort override exists at all, confirmed by reading `OrderController::index` directly; a frontend sort-column UI would be dishonest. **Laravel's own default pagination** (`->paginate()` with no `per_page` read from the request) — unlike Customers' own list endpoint, there is no `per_page` override capability here at all.

`GET /orders/{order}` (`orders.orders.view`) — the only endpoint that eager-loads the full aggregate: `items`, `addresses` (billing + shipping), `discounts`, `notes`, `timelineEvents`. This is the real, complete Order Detail data source.

### 2.4 Order Notes

`POST /orders/{order}/notes` (`orders.notes.manage` — a **third**, separate permission key from `.view`/`.manage`) — append-only (`OrderNote::UPDATED_AT = null`, no edit/delete endpoint exists at all). Real fields: `body` (`max:5000`), `is_customer_visible` (boolean, `sometimes`) — the backend genuinely distinguishes an internal-only note from one a (currently nonexistent) customer-facing surface would show. Requires `expected_version` — a note mutation bumps the parent Order's own `lock_version` via `touchAggregateVersion()`, the identical "child mutation versions the aggregate root" pattern Customers' own address book already established.

### 2.5 Order Timeline

Every Order automatically accumulates a `timelineEvents` collection — `order_placed`, `status_changed` (one per transition, each with a human-readable description e.g. "Order shipped (was processing)."), `note_added`. This is a real, always-populated, business-narrative feed **distinct from the Audit Log** (§2.6) — it exists specifically to read back cleanly on an Order Detail screen, already worded for that purpose, no client-side formatting needed.

### 2.6 Audit Log

`GET /orders/audit-logs` (`orders.audit_log.view` — a fourth, separate permission) — genuinely supports `actor_id` and `target_type` filters. **Confirmed: no `target_id` filter exists**, the identical shape as Customers' own audit endpoint researched during Phase 2.5. Every action (`order.placed`, `order.confirmed`, `order.shipped`, `order.cancelled`, `order.note_added`, etc.) is logged with real `before`/`after` snapshots and a correlation id. The same honest-design pattern Phase 2.5 already established for Customers (a bounded, client-filtered "Recent Activity" on Detail, plus a full unbounded Audit Log screen) transfers directly here.

### 2.7 Permissions

Four real, dedicated keys, fully separate from `customers.*`, `identity_access.*`, and every other module's own registry:

| Key | Grants |
|---|---|
| `orders.orders.view` | View orders, items, addresses, discounts, timeline |
| `orders.orders.manage` | Place orders and transition their status |
| `orders.notes.manage` | Add notes to orders |
| `orders.audit_log.view` | View Orders' audit log |

### 2.8 Events & Cross-Module Integration (confirmed by reading, not assumed)

- **`OrderPlaced`** — published once by `CreateOrderAction`. **Two real subscribers exist today**: `SendOrderConfirmationOnOrderPlaced` (Notifications) and `CreateShipmentOnOrderPlaced` (a dedicated cross-domain listener that calls Fulfillment's `CreateShipmentFromOrderPlacedAction`). This is a live, production integration — placing an order today genuinely creates a real Fulfillment shipment record, not a hypothetical.
- **`OrderStatusChanged`** — published by all five status-transition Actions. **Confirmed: zero subscribers exist anywhere in the codebase today** (grepped the full `app/` tree). This is a real, named gap in the *backend's own* integration completeness — not something a frontend slice can or should work around. Worth flagging to the Product Owner as a backend follow-up (e.g., a future Notifications listener for "your order shipped"), but out of scope for a frontend-only phase.
- **Payments**: `Payments\Actions\InitiatePaymentAction` references `CreateOrderAction`'s namespace (confirmed via grep) — Payments participates in the same Checkout→Order creation flow, consistent with the already-known Checkout↔Payments integration from earlier phases. No separate Orders↔Payments admin surface exists to build around.
- **Customers**: read-once at creation only (§2.2) — `Order.customer_id` is confirmed, via the `orders` migration's own docblock, to be **"identifier only — never a foreign key... mirroring"** the same cross-domain-by-identifier pattern already confirmed during the Customers Freeze Audit. No DB-level FK; `customer_name`/`customer_email`/`customer_phone` are frozen snapshots. This is exactly why Customer Detail's own "Recent Orders" card (built in Phase 2.5) has no reciprocal risk — deleting or editing a Customer never touches an existing Order's own data.

## 3. Merchant Workflows This Backend Actually Supports

Thinking as a merchant running daily operations against this real contract, not a hypothetical:

1. **Browse and find an order** — search by order number, customer name, or email; filter by status or customer; sorted newest-first (fixed). No column-sort UI is honest to build; a Status filter and a search box are.
2. **Open an order and see everything about it** — items, both addresses, discounts, notes, and the full business timeline, in one `show` call.
3. **Move an order through its lifecycle** — confirm → start processing → ship → deliver, one deliberate action at a time, each optimistic-lock-protected, each visibly recorded on the timeline and the audit log.
4. **Cancel an order with a stated reason** — from `pending`, `confirmed`, or `processing` only (not from `shipped`/`delivered`, which the backend correctly refuses).
5. **Leave an internal note on an order**, optionally marked customer-visible (a flag the backend tracks even though no customer-facing surface reads it yet).
6. **Investigate "what happened to this order and who did it"** — via the real, complete Audit Log (module-wide, `actor_id`/`target_type` filterable) plus the per-order Timeline already shown on Detail.
7. **See an order from the customer's side** — already built in Phase 2.5's Recent Orders card; this phase would build the reverse view (an order's own detail, not filtered by customer).
8. **(Open decision) Manually place an order for a customer** — technically supported by the real `POST /orders` endpoint, but per §2.2, the backend's own docblocks name Checkout as the intended path. Building this needs an explicit Product Owner call — see §6.

## 4. Proposed Information Architecture

Mirroring the Customers module's own now-frozen shape (a List + a dedicated Detail route, not drawers, plus a separate module-wide Audit Log screen):

- **Orders List** (`orders`) — `orders.orders.view`. Columns: Order # / Customer / Status (badge) / Grand Total / Placed / Updated. Server-side `q`, `status` filter, `customer_id` filter (deep-linkable from Customer Detail's own Recent Orders "View all" — a real, natural cross-link this backend already supports). Fixed newest-first order — no sortable-column UI, since none exists server-side. Real pagination (Laravel's default, no `per_page` control to build).
- **Order Detail** (`orders/:id`) — `orders.orders.view`. Overview (Order #, Status badge, Customer name/email/phone as of order time, Currency, Subtotal/Discount/Tax/Shipping/Grand Total, Placed/Updated); Items table; Billing + Shipping Address cards (labeled as historical snapshots, not live customer data); Discounts (if any); Notes (list + an add-note form, `orders.notes.manage`-gated, with the customer-visible toggle shown honestly as internal-only today); Timeline (the real, pre-worded business narrative from §2.5); Status actions (Confirm/Start Processing/Ship/Deliver/Cancel — each rendered only when `Order.canTransitionTo()` allows it, mirroring exactly how Inventory's own Reservation actions already gate on real server state rather than guessing client-side).
- **Orders Audit Log** (`orders/audit-log`) — `orders.audit_log.view`. Same shape as Customers' own: Type/Staff filters (`target_type`/`actor_id`), server-paginated, no `target_id` filter — same honest design already established.
- **Cross-links**: Customer Detail's existing "Recent Orders" card gains real `href`s into Order Detail (currently, per the Phase 2.5 report, it is display-only) — one small, additive change to an already-shipped card, not a new feature.

## 5. Recommended Implementation Slices

**Slice 1 — Order Visibility (List, Detail, Audit Log).** Everything in §4 that is purely read plus the already-real navigation actions (Confirm/Ship/etc., Cancel, Add Note) — all backed by existing, tested endpoints. This is the direct analogue of Customers' own Slice 1 scope and carries the same risk profile (near-zero — every field and filter is already confirmed to exist).

**Slice 2 (conditional) — Manual Order Entry**, only if the Product Owner decides `POST /orders` should be a real admin capability (§6 decision 1) rather than Checkout-only. Would reuse `CreateOrderRequest`'s exact shape — no new validation to invent — but needs real UI for building an item list against Catalog SKUs, which doesn't exist as a reusable pattern anywhere in this codebase yet (unlike Price List Entries' SKU lookup, this would need quantity + price entry per line, closer to a small POS-style form). Meaningfully more UI surface than Slice 1; scope it separately once decided.

No further slices are proposed — Orders' backend does not support shipment tracking numbers, carrier detail, refunds, or a customer-facing note surface (§6), so there is nothing further to build against without inventing backend capability.

## 6. Risks & Product Owner Decisions

1. **Should Admin support manually placing an order (Slice 2), or is Orders admin-side strictly read + lifecycle-management, with creation staying exclusively a Checkout/storefront responsibility?** The endpoint exists and is permission-gated either way; this is a scope decision, not a technical blocker. Recommend deferring Slice 2 until Slice 1 ships and the Product Owner has seen the real Order Detail screen in use.
2. **`OrderStatusChanged` has no subscriber today** (§2.8) — a real backend integration gap (e.g., no "order shipped" customer notification exists yet, unlike `OrderPlaced`'s own confirmation email). Not a frontend concern to fix or work around; flagged for backend/product visibility only.
3. **The customer-visible note flag has no customer-facing consumer yet** — `is_customer_visible` is tracked and will render correctly in Admin, but nothing outside Admin reads it today. Building the toggle honestly (as "internal note" vs. "flagged customer-visible, not yet shown to any customer") avoids over-promising a capability that isn't wired end-to-end.
4. **No order-level restore/delete/edit exists, by design** — confirmed via `Order.php`'s own docblock ("no soft-delete column"). Nothing to build, and nothing to work around; Order Detail should not offer any destructive or corrective action beyond the five real status transitions and Cancel.
5. **List sort is fixed server-side (`placed_at desc`)** — building a sortable-column UI would either lie about capability or require silently falling back to client-side re-sort of one page, both worse than an honest fixed-order list. Recommend no sort UI for Slice 1, matching how this document's own List design already omits one.

## 7. Readiness Score

**9/10 — ready to implement Slice 1 (Order Visibility) immediately**, on the same "build only what's real" discipline this engagement has followed for every prior phase. The one point held back is entirely the open Product Owner decision in §6.1 (manual order entry), which does not block Slice 1 and can be resolved independently, at any time, without touching anything Slice 1 ships.

---

*Research only, per this phase's own explicit instruction. No implementation. Stopping here pending separate Product Owner direction on Phase 2.6's build authorization.*
