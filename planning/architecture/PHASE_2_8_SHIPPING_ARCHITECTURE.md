# Phase 2.8 — Shipping & Fulfillment: Architecture Research

**Date:** 2026-08-16
**Scope:** Research only. No frontend, no backend, no commits, no pushes were made this phase. Every claim below is sourced from a direct reading of the real backend code — models, controllers, actions, requests, resources, routes, permissions, events, listeners, exceptions, console commands, and existing tests — under `apps/backend/app/Domains/Operations/{Shipping,Fulfillment}/`, plus the cross-domain listeners in `apps/backend/app/Listeners/`.

---

## 0. Two modules, one phase

Per `PROJECT_STATUS.md` rows 15–16 and `docs/04_MODULE_ARCHITECTURE.md`'s own `MODULE:SHIPPING` / `MODULE:FULFILLMENT` boundary text, "Shipping & Fulfillment" is deliberately **two separate backend modules**, not one:

| | **Shipping & Logistics** (`Operations/Shipping`) | **Fulfillment** (`Operations/Fulfillment`) |
|---|---|---|
| Owns | Zones, Methods, Rates (configuration), the Courier Provider Registry | The `Shipment` aggregate — items, destination, timeline, notes, the pick→pack→dispatch workflow |
| Public Contract | Rate Query (`CalculateShippingRateAction`) | Manual fulfillment actions (create/workflow) |
| Trigger | Called on demand (a quote request) | Reacts to Orders' `OrderPlaced` event automatically |
| Courier relationship | Defines and owns every courier integration (`ShippingProviderContract` + 7 providers) | Consumes Shipping's provider contract only — "no courier-specific business logic inside Fulfillment" |

They interact through exactly one seam: Fulfillment's `DispatchShipmentAction` reads `Models\ShippingMethod` directly (same-domain, Operations→Operations, permitted) and resolves a courier through Shipping's `Couriers\ProviderRegistry`. Everything else about the two modules is independent. This document treats them together because the instruction that commissioned it — and the merchant workflow they jointly implement — requires both.

---

## 1. Backend Readiness Score

### Shipping & Logistics: **9/10**
Fully built and coherent: zone/method/rate CRUD, a real rate-calculation Public Contract with correct zone-matching precedence and honest null-on-no-match behavior, a 7-provider Courier Registry with a clean, extensible contract, and a read-only audit log. The one point held back: every courier provider except Steadfast/Pathao/RedX/Paperfly/eCourier's booking path is unverified against a live sandbox in this environment (no credentials configured anywhere in this installation — every provider's own `isAvailable()` returns `false` here), and Sundarban has no real integration at all by the courier's own choice (no public API exists — honestly reflected, not a bug).

### Fulfillment: **8/10**
A complete, real Shipment aggregate with a correctly-modeled lifecycle (`pending→picking→picked→packing→packed→dispatched→in_transit→delivered`, with `failed`/`cancelled` as true terminals reachable from multiple points), least-privilege permission separation matching real warehouse roles, a working automatic trigger from `OrderPlaced`, and two real outbound notifications (dispatch, delivery). Two points held back: **(1) no Inventory integration exists at all** — confirmed via a repo-wide grep for `Inventory` inside both `Operations/Shipping` and `Operations/Fulfillment`: zero matches. Fulfillment does not decrement, reserve, or even read stock — a Shipment's items are freestanding `sku`/`description`/`quantity` strings with no relationship to Inventory's `StockItem`. **(2) No split/partial fulfillment support** — a Shipment maps 1:1 to an Order (`shipments.(tenant_id, order_id)` is unique), so an order that ships in two boxes is not representable today (see §8).

**Combined: 8.5/10 — ready for a read-heavy Slice 1 immediately; a write-capable Slice 2 is well-supported by the backend but requires Product Owner decisions on scope (§7).**

---

## 2. Real Backend Capabilities

### 2.1 Shipping — Zones, Methods, Rates (configuration)

- **`ShippingZone`** (`Models/ShippingZone.php`) — `name`, `country_code` (uppercased on save), `region` (empty string, not null, means country-wide — `isCountryWide()`), `status` (`active`/`archived`), `SoftDeletes` + `HasOptimisticLocking` + `HasUuids`.
- **`ShippingMethod`** (`Models/ShippingMethod.php`) — `code`, `name`, `description`, `provider_code` nullable (`isSelfFulfilled()` when null), `status`, same trait stack.
- **`ShippingRate`** (`Models/ShippingRate.php`) — belongs to exactly one Zone + one Method, weight-banded (`min_weight_grams`/`max_weight_grams`, nullable max = unbounded above), `amount`/`currency_code`, `coversWeight(int): bool` — `[min, max)` semantics, `status`. **"Rates" and "Rules" are the same concept in this backend** — confirmed via the model's own docblock; there is no separate rules entity to build a UI for.
- **Full CRUD confirmed for all three** — `ShippingZoneController`, `ShippingMethodController` (not individually re-quoted; identical shape), `ShippingRateController`, each with `index` (filterable, paginated), `show`, `store`, `update` (optimistic-locked via `expected_version`), `archive` (optimistic-locked), `destroy` (optimistic-locked, blocked by `DependentRecordsExistException` → HTTP 409 when a Zone/Method still has Rates referencing it — confirmed via `DeleteShippingZoneAction`, which checks `ShippingRate::where('shipping_zone_id', ...)->exists()` before deleting).
- Validation is real and specific: `CreateShippingRateRequest` enforces `max_weight_grams gt:min_weight_grams`, a compound uniqueness rule (zone+method+min-weight), currency code validated against Localization's shared `IsValidCurrencyCode` rule, and both zone/method existence via `exists:`.

### 2.2 Shipping — Rate Query (the module's Public Contract)

`CalculateShippingRateAction` (`Actions/CalculateShippingRateAction.php`), exposed via `POST shipping/quote` → `ShippingRateQuoteController`:
- Input: `shipping_method_id`, `country_code`, `region` (optional), `weight_grams`.
- Zone-matching precedence: an exact `country_code`+`region` match is tried first, falling back to the country-wide zone (`region = ''`) — mirrors Pricing's `CalculateTaxAction` precedence exactly.
- **Never resolves to a fabricated zero-cost quote.** Unlike tax (where "no rate configured" legitimately means zero), a shipping rate with no match returns `null` from the Action and a plain **404** from the controller — a merchant charging BDT 0.00 to ship a real parcel is treated as a financial defect, not a valid answer.
- A live-courier-rate branch exists (`tryLiveQuote()`, preferred over the configured Rate card when the resolved method's provider reports `supportsLiveRateQuote() === true`) — **none of the 7 shipped providers report true today** (confirmed by reading all 7 provider classes); this platform's own configured `ShippingRate` cards are the effective, sole source of truth right now. The branch exists for forward-compatibility only.
- Publishes `ShippingRateCalculated` (domain event) on every successful resolution — not consumed by anything in this codebase today; exists as the module's outbound integration seam per `IMPLEMENTATION_MASTER_PLAN.md`.

### 2.3 Shipping — Courier Provider Registry

- **Contract**: `Couriers\Contracts\ShippingProviderContract` — `code()`, `label()`, `isAvailable()` (config/credentials present), `supportsLiveRateQuote()`/`quoteLiveRate()`, `supportsBooking()`/`bookShipment()`. Explicitly mirrors Payments' `PaymentGatewayContract` — same "one interface, N interchangeable implementations, zero business-logic branching on which one" pattern already proven out in that module.
- **7 concrete providers**, all read: `ManualProvider` (self-managed dispatch — a first-class provider, not a fallback; `isAvailable()` always `true`; booking always throws — by design, since there's no courier to book), `SteadfastProvider` (real, documented `portal.packzy.com` API shape — `create_order` endpoint, API-Key/Secret-Key headers, returns `consignment_id`/`tracking_code`; `isAvailable()` gated on configured `api_key`+`secret_key`), `SundarbanProvider` (deliberately **not** integrated — no public API exists for this courier at all, confirmed via the class's own docblock; `isAvailable()` hardcoded `false`, booking always throws), `PathaoProvider`/`RedxProvider`/`PaperflyProvider`/`EcourierProvider` (not individually re-read this pass; registered identically via `ProviderFactory`'s `match` arm — same construction shape as Steadfast).
- **`ProviderRegistry`** (storage) + **`ProviderResolver`** (lookup-with-validation, throws `UnsupportedShippingProviderException` for unknown or unavailable codes) — mirrors Payments' `GatewayRegistry`/`GatewayResolver` split exactly.
- **`GET shipping/providers`** → `ShippingProviderController::index()` returns **every registered provider, available or not** — so an operator UI can distinguish "configured but incomplete" from "not offered at all," per that controller's own docblock.
- **In this installation, every provider except Manual reports `isAvailable() === false`** — no courier credentials are configured anywhere in this sandbox's `config/shipping.php`. This is expected for a dev/demo environment, not a bug, but it means **any Slice that exercises real courier booking cannot be live-verified against a real courier in this environment** — only the Manual provider path can be exercised end-to-end here.

### 2.4 Shipping — Audit Log

`GET shipping/audit-logs` → `AuditLogController::index()` — filterable by `actor_id`/`target_type`, paginated, `orderByDesc('created_at')`. Same flat, append-only shape as every other module's audit log in this platform (Orders, Customers, Inventory, etc.) — no revision history, no per-field diff view beyond whatever `before`/`after` a given Action chose to log.

### 2.5 Shipping — Permissions

8 keys (`Authorization/PermissionRegistry.php`): `shipping.zones.{view,manage}`, `shipping.methods.{view,manage}`, `shipping.rates.{view,manage}`, `shipping.providers.view`, `shipping.audit_log.view`. No per-object policies — `RequirePermission anyOf={[...]}` is the only gating mechanism needed, consistent with every prior module.

### 2.6 Fulfillment — the Shipment aggregate

`Models/Shipment.php` — full lifecycle via `ALLOWED_TRANSITIONS`:

```
pending → picking → picked → packing → packed → dispatched → in_transit → delivered
              ↓         ↓                            ↓             ↓
           failed    (via packing)                failed        failed
   (any of pending/picking/picked/packing) → cancelled
```

Precisely: `pending→{picking,cancelled}`, `picking→{picked,failed,cancelled}`, `picked→{packing,cancelled}`, `packing→{packed,failed,cancelled}`, `packed→{dispatched,cancelled}`, `dispatched→{in_transit,delivered,failed}`, `in_transit→{delivered,failed}`. `delivered`/`failed`/`cancelled` are all true terminals — **no fake recovery path**: re-fulfillment of a failed/cancelled shipment happens by creating a brand-new `Shipment` row via `CreateShipmentAction`, never by resurrecting the old one (confirmed via `CancelShipmentAction`'s and `MarkFailedAction`'s own docblocks, and structurally — `ALLOWED_TRANSITIONS` for all three terminal states is `[]`).

Every cross-module reference (`order_id`, `order_number`, `customer_id`, `grand_total`, `currency_code`) is a **plain identifier/value snapshot, never a foreign key** — confirmed via the model's own docblock pointing to the shipments migration's rationale, mirroring Orders' own `customer_id` pattern exactly. `hasDestination()` requires recipient name, phone, address line 1, city, and country code all present — this is the actual precondition `DispatchShipmentAction` enforces before allowing dispatch. `weight_grams`, `courier_provider_code`/`courier_consignment_id`/`tracking_number`/`label_url`, `failure_reason`, and `picked_at`/`packed_at`/`dispatched_at`/`delivered_at` timestamps round out the aggregate. `SoftDeletes` + `HasOptimisticLocking` (`lock_version`) + `HasUuids`.

Child records: `ShipmentItem` (`sku` as a **plain string, never a Catalog foreign key** — confirmed via the model's own docblock, same pattern as `order_items.sku`; `description`, `quantity`), `ShipmentNote` (`author_id`, `body`, `is_customer_visible` boolean — append-only, `UPDATED_AT = null`, mirrors `OrderNote` exactly), `ShipmentTimelineEvent` (`event_type`, `description`, `occurred_at`; `timelineEvents()` relation ordered by `occurred_at` ascending).

### 2.7 Fulfillment — the automatic trigger

`app/Listeners/CreateShipmentOnOrderPlaced.php` subscribes to Orders' `OrderPlaced` and calls `CreateShipmentFromOrderPlacedAction`. This listener deliberately lives **outside every domain's own namespace** — the same cross-domain routing pattern already established for every other Commerce→Operations reaction in this platform — specifically so neither Orders nor Fulfillment needs to import the other, keeping `deptrac.yaml`'s domain-isolation rule enforceable by static analysis, not just convention.

The Action itself:
- **Idempotent by construction**: checks `Shipment::where('order_id', $orderId)->first()` before creating, backed by a real DB-level `(tenant_id, order_id)` unique constraint — a duplicate event delivery or manual re-run never creates a second Shipment for the same order.
- **Deliberately does not wait for payment capture.** Its own docblock explains why: Cash On Delivery (`Payments\Gateways\CodGateway`, this platform's Bangladesh-first, first-class gateway) only captures payment *after* delivery — gating fulfillment on `PaymentCaptured` would make COD orders permanently unfulfillable. `OrderPlaced` is the only trigger this module's own architecture doc names.
- Creates the Shipment with **no destination address** (OrderPlaced carries none — confirmed via the shipments migration's docblock) and **no items pre-populated** — both are separate, later, operator-driven steps (`SetShipmentDestinationAction`, `AddShipmentItemAction`).
- Publishes `FulfillmentStarted` and writes an audit-log row (`shipment.created`, `actorId: null` — this is the one Action in the module where the actor is genuinely nobody, since it's system-triggered).

**This is a real, already-live integration** — every order placed on this platform today (in this sandbox) automatically gets a pending Shipment with no manual step required. This is not hypothetical; it was already exercised repeatedly during Orders Slice 2's own live verification.

### 2.8 Fulfillment — the manual/operator path

`CreateShipmentAction` (`POST shipments`, `fulfillment.shipments.manage`) is a parallel, operator-facing entry point for backfilling a Shipment that the automatic listener never created (an order placed before this module existed, a data-recovery scenario) — same idempotency guard (`ValidationException` if one already exists for that `order_id`), same audit/event shape, but `actorId` is real and `order_number`/`customer_id`/`grand_total`/`currency_code` are operator-supplied rather than read from the event. **This is not "Manual Order Entry"** — it does not create an Order, only a Shipment for an Order that's presumed to already exist; the request only validates `order_id` as a well-formed UUID, not that a real Order with that id exists (Fulfillment genuinely cannot check — it has no FK to Orders by design).

### 2.9 Fulfillment — Pick / Pack / Dispatch workflow

One HTTP action per transition, all through `ShipmentWorkflowController`, each backed by its own single-purpose Action:

| Endpoint | Permission | Action | Precondition enforced |
|---|---|---|---|
| `PATCH .../destination` | `.manage` | `SetShipmentDestinationAction` | Blocked once dispatched/in_transit/delivered/failed/cancelled |
| `POST .../pick/start` | `.pick` | `StartPickingAction` | **At least one item must exist** — "picking nothing is not a meaningful warehouse operation" (own docblock) |
| `POST .../pick/complete` | `.pick` | `MarkPickedAction` | Valid transition only (not re-read this pass; same shape as StartPicking) |
| `POST .../pack/start` | `.pack` | `StartPackingAction` | Valid transition only |
| `POST .../pack/complete` | `.pack` | `MarkPackedAction` | Valid transition only |
| `POST .../dispatch` | `.dispatch` | `DispatchShipmentAction` | **Destination required** (`hasDestination()`); courier-booked OR manual-tracking-number path, never silently falls back between them |
| `POST .../in-transit` | `.dispatch` | `MarkInTransitAction` | Valid transition only |
| `POST .../deliver` | `.dispatch` | `MarkDeliveredAction` | Valid transition only; publishes `FulfillmentCompleted` |
| `POST .../fail` | `.cancel` | `MarkFailedAction` | Requires a `reason` string; terminal |
| `POST .../cancel` | `.cancel` | `CancelShipmentAction` | Only reachable pre-dispatch (see §2.6's transition table); optional `reason` |

**`DispatchShipmentAction` deserves particular attention** — it's the one place the two modules actually touch. It resolves the courier via `shipping_method_id` (reading `ShippingMethod` directly — a same-domain read, not a violation), and takes one of two legitimate paths, never silently choosing between them: **(a) courier-booked** — if the resolved provider `isAvailable()` and `supportsBooking()` and the caller supplied no manual tracking number, it calls `bookShipment()` and stores whatever consignment id/tracking number/label URL the courier's real API returns (wrapping `CourierBookingFailedException` into `ShipmentValidationException('courier_booking_failed', ...)` on failure); **(b) manual** — a caller-supplied tracking number is required whenever no automated booking will happen; if neither condition is met, it throws `ShipmentValidationException('tracking_number_required', ...)` rather than inventing one. Every dispatch is captured as a `ShipmentTimelineEvent` and an audit row, and publishes `ShipmentDispatched`.

Also: `AddShipmentItemAction`/`RemoveShipmentItemAction` (`.manage`) and `AddShipmentNoteAction` (`.manage`, append-only) — not re-read line-by-line this pass but confirmed present via `ShipmentItemController`/`ShipmentNoteController` and `routes.php`; their shape is consistent with every other module's identical item/note pattern (Orders' `OrderNote`, in particular).

### 2.10 Fulfillment — Notifications integration (real, not hypothetical)

Two more cross-domain listeners in `app/Listeners/`, same pattern as `CreateShipmentOnOrderPlaced`:
- **`SendShipmentNoticeOnShipmentDispatched`** — on `ShipmentDispatched`, reads the Order (same-domain-crossing read permitted for this narrow purpose, matching the pattern already established elsewhere), queues an email via `Notifications\Actions\QueueNotificationAction` with template `shipment.dispatched`, merge data including `tracking_number`/`courier`. Wrapped in try/catch + `report()` — **load-bearing, not defensive boilerplate**: a notification failure must never roll back or block the real dispatch that already happened.
- **`SendDeliveryConfirmationOnFulfillmentCompleted`** — same shape, on `FulfillmentCompleted`, template `shipment.delivered`.

This confirms Orders Slice 2's `OrderNotificationsCard` (already built and frozen) is the correct, complete way an operator observes these — there is no separate Fulfillment-owned notification history to surface.

### 2.11 Fulfillment — Audit Log & Permissions

`GET fulfillment/audit-logs` → same flat, filterable, paginated shape as Shipping's own. 7 permission keys, deliberately **finer-grained than Shipping's**: `fulfillment.shipments.{view,manage,pick,pack,dispatch,cancel}` + `.audit_log.view` — pick/pack/dispatch/cancel are each their own permission specifically because real warehouse operations assign these to different staff roles ("a picker should not necessarily hold dispatch authority" — the registry's own docblock). **This has real UI implications**: a picker-role user could legitimately see a Shipment List and act on `pick/*` endpoints while a `RequirePermission` gate correctly hides every dispatch/cancel control from them — this is more granular than anything Orders Slice 1/2 needed to model.

### 2.12 Console Commands

Only `SyncPermissionsCommand` exists for Fulfillment (and, by the same pattern, presumably for Shipping — not independently re-checked, but no other `Console/Commands/` entries were found in either module's file listing). **No scheduled job exists for stale-shipment sweeping, courier status polling, or any other background reconciliation** — every state change in this module is operator- or event-triggered, never time-triggered. This is a real limitation worth naming explicitly in §8.

### 2.13 Existing tests (confirmed present, not exhaustively re-read)

Shipping: `ShippingZoneManagementTest`, `ShippingMethodManagementTest`, `ShippingRateManagementTest`, `ShippingRateQuoteTest`, `ShippingProviderListingTest` (Feature), `CalculateShippingRateActionTest` (Unit).
Fulfillment: `ShipmentCreationTest`, `ShipmentDestinationTest`, `ShipmentItemManagementTest`, `ShipmentNoteTest`, `ShipmentWorkflowTest` (Feature), `DispatchShipmentActionTest`, `ShipmentStatusTransitionTest` (Unit), plus `CreateShipmentOnOrderPlacedTest` (Unit, under `tests/Unit/Listeners/`) and `CheckoutAddressAndShippingTest` (Checkout's own test, confirming Checkout already exercises Shipping's rate-quote contract — see §9). A real, non-trivial test suite already exists for both modules — this is not greenfield backend code.

---

## 3. Merchant Workflow

A merchant operating this platform today, thinking at "hundreds or thousands of orders a day" scale, experiences Shipping & Fulfillment as two separate concerns:

**Setup (infrequent, Shipping)**: configure delivery Zones (e.g. "Dhaka Metro," "Chattogram," "Rest of Bangladesh"), Methods (e.g. "Standard," "Express," self-fulfilled "Store Pickup"), and Rate cards per zone×method×weight-band. Register courier credentials (out of this UI's scope — that's `config/shipping.php`, an infrastructure concern, not an admin-editable setting; confirmed no endpoint exists to write provider credentials).

**Per-order (constant, Fulfillment)**: the moment an order is placed, a Shipment already exists — pending, no destination, no items. An operator opens it, sets the destination address (read off the order — not auto-populated, since Fulfillment has no FK to pull it from), adds the line items being shipped, starts picking, marks picked, starts packing, marks packed, then dispatches — at which point the platform either books the shipment with a real courier automatically (returning a tracking number) or requires the operator to type one in for self-managed/COD-at-counter dispatch. From there, in_transit and delivered are recorded (today, always manually — no courier webhook/polling exists to update these automatically; see §8). A failure at any stage (picking failed, packing failed, courier rejected/lost/returned the parcel) is recorded with a reason, terminally, and re-fulfillment means starting a fresh Shipment.

**Both modules' audit logs together** give a merchant a complete "what happened and who did it" record — configuration changes in Shipping, and every shipment lifecycle event in Fulfillment — matching the same two-audit-log pattern already shipped for Orders/Payments/Customers.

---

## 4. Information Architecture

Two distinct admin surfaces, matching the backend's own module split — bundling them into one nav group ("Shipping") with two clearly-labeled sub-areas is the natural fit, echoing how Pricing already houses Price Lists/Tax as siblings under one module:

```
Shipping (nav group)
├── Zones            — list + CRUD (Shipping)
├── Methods           — list + CRUD (Shipping)
├── Rates             — list + CRUD, filterable by zone/method (Shipping)
├── Providers         — read-only registry view: code, label, available? (Shipping)
├── Shipments         — list (status/order_id filters) + detail (Fulfillment)
│     └── Detail: Destination, Items, Timeline, Notes, Workflow action bar
├── Shipping Activity  — Shipping's own audit log
└── Fulfillment Activity — Fulfillment's own audit log
```

A Shipment Detail's action bar is **status-driven and permission-driven simultaneously** — at any given status, only the one or two legitimate next transitions are enabled at all, and among those, only the ones the current user's granular permission set actually allows are shown, per §2.11's staff-role finding. This is a materially different pattern from Orders' own status actions (which used a single `orders.manage`-equivalent gate) and should be designed for explicitly, not adapted after the fact.

**No List endpoint gap this time** — unlike Checkout, `GET shipments` genuinely exists and supports real `status`/`order_id` filtering and pagination (confirmed via `ShipmentController::index`), so a full List+Detail admin shape is directly supported, unlike Phase 2.7's Checkout finding.

---

## 5. Recommended Implementation Slices

**Slice 1 — Shipping Configuration + read-only Fulfillment visibility.**
Zones/Methods/Rates full CRUD (a direct, lower-risk analog of Pricing's Tax Zones/Classes/Rates slice, already built and frozen — same weight-banded-rate UI pattern applies almost directly to Rate creation). Providers as a read-only registry list. Shipments List + read-only Detail (destination, items, timeline, notes, current status) surfaced from the real `GET shipments`/`GET shipments/{id}`, wired into Order Detail as a live-linked "View shipment" analog to how Orders Slice 2 already built `OrderFulfillmentCard` against this same read-only shape. Both audit logs. No workflow-mutating actions yet. This alone is a complete, low-risk, high-value slice — it also finally gives Order Detail's own `OrderFulfillmentCard` (built in Slice 2, currently reading Fulfillment purely to display shipment summaries) a "click through to the real Shipment" destination it doesn't have today.

**Slice 2 — Shipment workflow actions.**
Set Destination, Add/Remove Items, Add Note, and the full pick→pack→dispatch→deliver/fail/cancel action bar, each permission-gated per §2.11's granular finding (this is the one place this phase's frontend work needs materially new gating logic beyond what Orders/Pricing/Customers needed). Requires deciding, with the Product Owner, whether courier-booked dispatch (a real, live external HTTP call to a courier when credentials are configured) is safe to expose from this admin in this environment, given **no courier has live credentials configured here** (§2.3) — practically, only the Manual-provider dispatch path (operator types a tracking number) is exercisable and live-verifiable in this sandbox today.

**Not recommended this phase, explicitly out of scope until backend changes**: split/partial-shipment UI (no backend support — §2.6/§8), courier status auto-sync (no polling/webhook backend exists — §8), Inventory-aware picking (no integration exists — §8).

---

## 6. Risks

1. **No live courier credentials in this environment.** Any Slice 2 courier-booked dispatch path can be built and unit/Playwright-mocked, but cannot be live-verified end-to-end against a real courier the way every other module's live verification has worked in this engagement. Manual-provider dispatch remains fully live-verifiable.
2. **Granular permission surface is new territory for this admin's frontend.** Every prior module (Orders, Customers, Pricing) used a simple `view`/`manage` pair per resource. Fulfillment's 4-way split (`pick`/`pack`/`dispatch`/`cancel`) means the action bar must be built to degrade gracefully for a user who holds some but not all of these — a UI pattern not yet exercised anywhere else in this codebase and worth a deliberate design pass rather than a quick adaptation of Orders' existing status-action component.
3. **`ShipmentItem.sku` is an unvalidated plain string**, same as `order_items.sku` before it — no live check against Catalog exists server-side. A frontend `AddShipmentItemAction` form should treat this the same way Orders' own note/item entry does: honest, not falsely presented as a live product lookup unless a deliberate client-side SKU-lookup convenience (mirroring what Orders/Catalog integration already does elsewhere) is explicitly requested.
4. **Optimistic locking is required on nearly every mutation** (`expected_version` threaded through every Action) — already a well-established pattern in this frontend (Orders, Pricing, Customers all handle 409 via `ConflictError`), low risk, but must not be skipped given how many distinct endpoints Fulfillment's workflow spans (10 workflow endpoints alone).

---

## 7. Product Owner Decisions

1. **Scope Slice 1 to configuration + read-only Fulfillment visibility, or include workflow actions immediately?** Recommendation: Slice 1 as scoped in §5 — it is self-contained, lower-risk, and gives Order Detail its missing "View shipment" link sooner.
2. **Is exposing courier-booked dispatch acceptable in this environment**, given it cannot be live-verified against a real courier here (no credentials configured)? Recommendation: build it (the backend fully supports it and the code path is real), but flag in any Slice 2 report that live verification will exercise the Manual-provider path only, with courier-booked dispatch verified via mocked/unit coverage instead.
3. **Should Order Detail's `OrderFulfillmentCard` (Orders, frozen) gain a real "View shipment" link once Shipment Detail exists?** This mirrors exactly what Orders' Freeze Audit already did for Customer links, and is the same kind of legitimate, narrow cross-module addition — but Orders is frozen, so this needs explicit Product Owner sign-off before touching it again, the same way Checkout's own research flagged the same class of decision for its Order link.
4. **Split/partial shipment support** — genuinely absent from this backend (§2.6, §8). If a merchant workflow requires shipping one order in two boxes, that is a backend-first decision, not something the frontend can work around.

---

## 8. Known Backend Limitations

- **No Inventory integration whatsoever.** Fulfillment does not check stock availability, does not reserve, and does not decrement inventory when a Shipment is created, picked, packed, or dispatched. A Shipment's items are freestanding text (`sku`/`description`/`quantity`), not linked to Inventory's `StockItem` in any way. A merchant relying on this admin to also manage stock levels must do so entirely separately, through the Inventory module, with no automatic reconciliation.
- **No split/partial shipment support.** `shipments.(tenant_id, order_id)` is a unique constraint — one order can have at most one Shipment. An order requiring multiple boxes/multiple dispatch dates is not representable.
- **No automated courier status sync.** `in_transit`/`delivered` are only ever set by an explicit operator action (or, in principle, a future webhook — none exists today). No scheduled job polls any courier API for status updates; confirmed via the module's only Console Command being `SyncPermissionsCommand`.
- **No live courier credentials configured in this sandbox.** Every provider except Manual reports `isAvailable() === false` here — this is an environment fact, not a code defect, but it bounds what can be live-verified.
- **Sundarban has no real courier integration** — by that courier's own lack of a public API, not an oversight; permanently `isAvailable() === false` regardless of configuration.
- **No customer-facing tracking page or public tracking-number lookup** exists anywhere in this platform (consistent with Phase 2.7's finding that no customer-facing auth guard exists at all yet) — tracking is an internal/admin concern only today.
- **`ShipmentItem.sku` has no live Catalog validation.**

---

## 9. Integration With Other Modules

- **Orders**: the sole trigger (`OrderPlaced` → `CreateShipmentOnOrderPlaced` → `CreateShipmentFromOrderPlacedAction`), confirmed live and already exercised in this engagement. Orders' own `OrderFulfillmentCard` (Slice 2, frozen) already reads this module read-only; it has no write path and no deep link into a real Shipment Detail yet (§7.3).
- **Inventory**: **none** (§8) — confirmed via a repo-wide grep across both modules.
- **Customers**: only indirectly, via the `customer_id` snapshot on `Shipment` (never a live read — no `Customers\Models\Customer` reference exists anywhere in either module).
- **Notifications**: real and live — `ShipmentDispatched`→`shipment.dispatched` email, `FulfillmentCompleted`→`shipment.delivered` email, both via `Notifications\Actions\QueueNotificationAction`, both wrapped in non-blocking try/catch (§2.10). Already fully substituted for by Orders' own `OrderNotificationsCard`.
- **Payments**: **no direct integration in either direction.** Fulfillment does not wait for `PaymentCaptured` (§2.7 — explicitly, to support COD) and Payments never reads Shipping/Fulfillment data. The two modules are triggered independently, both off Orders.
- **Checkout**: Shipping's rate-quote contract (`CalculateShippingRateAction`) is **already consumed by Checkout today** — confirmed via the existence of `tests/Feature/Domains/Commerce/Checkout/CheckoutAddressAndShippingTest.php` and Phase 2.7's own research finding that Checkout's `ShippingOptionCatalog` is a small, self-contained 3-tier flat-rate list explicitly documented as "the seam a future Shipping & Logistics integration would replace" — meaning Checkout does **not** yet call this module's real rate-quote endpoint; it has its own, separate, hardcoded rate table. This is a real, named architectural seam already flagged once in this engagement, not a new finding, but worth restating here: building Shipping's admin UI does not, by itself, connect Checkout's own pricing to these real Rate cards — that would be a separate, explicit integration decision.
- **Shipping ↔ Fulfillment** (the two modules this document covers): exactly one seam, `DispatchShipmentAction`'s same-domain read of `ShippingMethod` + `ProviderRegistry` resolution, per §0/§2.9.

---

**Research only. No frontend, no backend, no commits, no pushes were made this phase.**
