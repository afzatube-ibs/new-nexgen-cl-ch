# Phase 2.7 — Checkout: Architecture & Readiness Research

**Date:** 2026-08-16
**Status:** Research only. No frontend or backend code written. No schema/route/permission changes.
**Scope of this document:** what the real, already-complete Checkout backend (`apps/backend/app/Domains/Commerce/Checkout/`) actually supports, read directly from source — Models, Controllers, Actions, Requests, Resources, Routes, Permissions, Events, Audit, existing tests — plus its confirmed integration with Catalog, Inventory, Pricing, Customers, Orders, Payments, and Fulfillment. No business logic or API contract is invented anywhere in this document.

> **Update — 2026-08-28 (neXgen Overnight Sprint, Milestone 1, Objective 1):** the flat-rate `Support\ShippingOptionCatalog` this document describes below (§ "shipping-option") has been **removed**. Checkout's shipping-option seam now accepts a real, externally-resolved quote (`shipping_method_id`/`shipping_label`/`shipping_amount`/`currency_code`), composed at the Gateway from Operations\Shipping's own real, new `POST shipping/quote-options` endpoint — the Commerce/Operations domain boundary this document's own research never needed to cross is preserved exactly as designed; see `planning/reports/NEXGEN_OVERNIGHT_SPRINT_MILESTONE_1_REPORT.md` for the full change.

---

## 1. Backend Readiness

**Checkout is a real, complete, extensively-tested backend module** — full guest and registered-customer checkout, a real saga-based submission flow, real idempotency, real recovery of abandoned carts, and a real scheduled expiration sweep. 7 Feature test files (`CheckoutSessionManagementTest`, `CheckoutItemManagementTest`, `CheckoutAddressAndShippingTest`, `CheckoutCouponTest`, `CheckoutReviewTest`, `CheckoutSubmissionTest`, `CheckoutRecoveryTest`) plus a Unit test file confirm this module already has its own independent regression coverage.

| Area | Status |
|---|---|
| Model (`CheckoutSession` + `CheckoutItem`) | Complete — a real 5-state status graph (`open ⇄ reviewed → submitting → submitted`, with `expired` reachable from `open`/`reviewed`) |
| Controllers | Complete — 8 controllers covering session, items, addresses, shipping option, coupon, review, submission, recovery, plus a dedicated audit log controller |
| Actions | Complete — 11 Actions, each single-aggregate-transactional per this platform's own `DATA:TRANSACTION_BOUNDARIES` rule |
| Requests | Complete — full validation on every write, including a genuine guest-vs-registered mutual-exclusivity rule on session start |
| Resources | Complete — `CheckoutSessionResource` (+ nested `CheckoutItemResource`), `AuditLogResource` |
| Routes | Complete — 13 endpoints under `api/v1`, all `auth:sanctum` + `permission:` gated |
| Permissions | Complete, dedicated 3-key registry (`checkout.sessions.view`/`.manage`, `checkout.audit_log.view`) — separate from every other module's keys |
| Events | Complete — `CheckoutStarted`, `CheckoutCompleted`, `CheckoutAbandoned` — confirmed **zero subscribers exist today** for any of the three (grepped the full `app/` tree; the future Growth & Automation domain is this module's own docblock-named anticipated subscriber, not yet built) |
| Audit | Complete — every action logs via `Checkout\Audit\AuditLogger`, same `target_type`/`actor_id`-only filter shape as every other module's own audit endpoint researched this engagement (no `target_id` filter) — but see §2.6 for why individual rows still carry a usable `target_id` |
| Existing tests | 7 Feature + 1 Unit Pest file, confirmed present |

**A critical, non-obvious finding that shapes this entire document**: **`GET /checkout/sessions` (a list/browse endpoint) does not exist on this backend at all.** Confirmed by reading `routes.php` directly — only `POST /checkout/sessions` (create) and `GET /checkout/sessions/{session}` (show, by a known id) exist. There is no way to browse, filter, or page through checkout sessions the way every other module's own List page in this engagement has been built. This is not an oversight to work around — the whole design (see §3) is a real-time, single-session API meant for a client actively driving one specific checkout, not a merchant browsing many.

**Readiness score: 9/10** for the backend itself (rock-solid, real, well-tested) — but see §5 and §6 for why this does **not** translate into readiness for a traditional "Admin CRUD module" the way Orders and Customers did.

## 2. Existing Capabilities (read directly from source, not assumed)

### 2.1 Checkout Session Lifecycle

```
open ⇄ reviewed → submitting → submitted
  \         \            |
   \---------\-----------+--> expired
```

Any cart-mutating action (add/update/remove item, change an address, change the shipping option, apply/remove a coupon) resets a `reviewed` session back to `open` — stale totals are never submittable (`resetReviewIfNeeded()`, called by every mutating Action). `submitting` is transient and only ever observed mid-request by a genuinely concurrent second submission attempt. `expired` is terminal, reachable only from `open`/`reviewed`.

### 2.2 Starting a Session — Guest or Registered

`POST /checkout/sessions` (`checkout.sessions.manage`) — `StartCheckoutAction`. Exactly one of `customer_id` or the (`guest_email`, `guest_name`) pair is required (server-enforced mutual exclusivity, confirmed via `StartCheckoutRequest::withValidator`). For a registered customer, this is one of only two places on the whole platform that reads Customers' address book on the customer's behalf (the other is Orders' own `CreateOrderAction`) — it pre-populates billing/shipping from whichever addresses are flagged `is_default_billing`/`is_default_shipping`, a convenience, not a requirement (either can still be overridden before review).

### 2.3 Cart Management

`POST/PATCH/DELETE /checkout/sessions/{session}/items` (`checkout.sessions.manage`) — `AddCheckoutItemAction`/`UpdateCheckoutItemAction`/`RemoveCheckoutItemAction`. Adding an already-present SKU merges into the existing line (real "add to cart" semantics, backed by a real unique `(checkout_session_id, sku)` index) rather than creating a duplicate. `AddCheckoutItemAction` is the one place this module reads Catalog directly — confirms the `Product` (or a specific `variant_id`) is real and `STATUS_ACTIVE`, resolves the SKU/name/category ids from it. Every item mutation resets review and bumps the session's own `lock_version` via `touchAggregateVersion()`.

### 2.4 Address & Shipping

`PUT /checkout/sessions/{session}/billing-address` / `.../shipping-address` (`checkout.sessions.manage`) — `SetCheckoutAddressAction`, identical resolution shape to Orders' own `CreateOrderAction::resolveAddress()`: either `address_id` from the registered customer's own address book, or a full inline address (a guest session has no address book to reference, so `address_id` is meaningless there). `PUT /checkout/sessions/{session}/shipping-option` — `SelectShippingOptionAction`, against `GET /checkout/shipping-options` (`ShippingOptionCatalog::all()`, a real but deliberately-small, non-database-backed flat-rate list — **standard $5, express $15, overnight $30** — confirmed via source, honestly documented as "the exact seam a future Shipping & Logistics module replaces," not a placeholder).

### 2.5 Coupons & Review

`POST/DELETE /checkout/sessions/{session}/coupon` (`checkout.sessions.manage`) — `ApplyCouponAction`/`RemoveCouponAction`, deliberately does **not** itself validate the code (that would duplicate Promotions' own eligibility logic) — applying a code just means "evaluate this the next time the session is reviewed." `POST /checkout/sessions/{session}/review` (`checkout.sessions.manage`) — `ReviewCheckoutAction`: the one place this module calls Pricing's `LookupPriceAction`/`CalculateTaxAction` and Promotions' `EvaluatePromotionsAction`, all read-only, recomputing the full subtotal/discount/tax/shipping/grand-total breakdown from scratch every time (never trusting stale figures) and transitioning the session to `reviewed`. Requires items, both addresses, and a shipping option to already be set — a real, complete server-side "is this cart ready to submit" gate, confirmed via source, not inferred.

### 2.6 Submission — the real saga

`POST /checkout/sessions/{session}/submit` (`checkout.sessions.manage`) — `SubmitCheckoutAction`, this module's most important piece of orchestration, confirmed via direct source read to be a genuine multi-step saga (never one database transaction spanning multiple aggregates, per this platform's own `DATA:TRANSACTION_BOUNDARIES` rule):

1. **Claim** — locks the session row, verifies `reviewed` and not expired, sets `submitting`. This row lock is the actual duplicate-submission-protection mechanism (a second concurrent request blocks here, then observes `submitting`→rejected or `submitted`→returns the existing order).
2. **Reserve stock** — one real Inventory `ReserveStockAction` call per item; any failure releases everything already reserved via `ReleaseReservationAction` and reverts the session to `reviewed`.
3. **Resolve the customer** — a guest session reuses an existing Customer by email or registers a new one via Customers' own `RegisterCustomerAction` (with a random, never-communicated password — the guest never authenticates with it).
4. **Redeem promotions** — one real Promotions `RedeemPromotionAction` call per applied promotion; a documented, accepted limitation is that Promotions exposes no "undo a redemption" capability, so a redemption that succeeds before a *later* step fails cannot itself be reversed (fully audited both here and in Promotions' own trail, not a silent gap).
5. **Create the Order** — one real Orders `CreateOrderAction` call, from figures this action only sums and passes through, never recalculates.
6. **Finalize** — sets `submitted` and stamps the session's own `order_id`.

A retry with the same session after a full success short-circuits at step 1 to the existing Order — genuine idempotency, confirmed via source, not assumed. `idempotency_key` (client-supplied, required) plus `expected_version` (optimistic-lock-aware, real 409s) both gate every submission.

**Confirmed via direct source read: Checkout does NOT call Payments at any point in this saga.** No Payment step exists in `SubmitCheckoutAction`'s own six-step list. Payment initiation is a real, separate concern — a caller (today, only a staff caller with `payments.payments.manage`) would call Payments' own `POST /payments` directly, with the newly-created `order_id`, *after* checkout completes. Checkout and Payments are connected only through the resulting Order, never a direct call.

**Confirmed via direct source read: Checkout does NOT call Fulfillment either.** The real Shipment that appears once an order exists is triggered by `OrderPlaced` (published by Orders' own `CreateOrderAction`, step 5 above), consumed by the already-known `CreateShipmentOnOrderPlaced` listener — an indirect, event-driven integration one hop away from Checkout, not something Checkout orchestrates itself.

### 2.7 Recovery & Expiration

`POST /checkout/sessions/{session}/recover` (`checkout.sessions.manage`) — `RecoverCheckoutSessionAction`: for an already-expired session (time-based, not status-based — recoverable the instant `expires_at` passes, without waiting on the sweep), opens a **brand-new** session pre-populated with the old one's cart/addresses/shipping selection, rather than resurrecting the expired row. `Console\Commands\ExpireCheckoutSessionsCommand` (a real, schedulable Artisan command, not wired to Laravel's scheduler by this repo — an operator's own deployment responsibility, confirmed via source) sweeps `open`/`reviewed` sessions past `expires_at`, marks them `expired`, and publishes `CheckoutAbandoned` (currently unsubscribed — see §1).

### 2.8 Audit Log

`GET /checkout/audit-logs` (`checkout.audit_log.view`) — `actor_id`/`target_type` filters only, the same real constraint every other module's own audit endpoint has (no `target_id` filter parameter). **Difference worth noting**: every audit row still carries its own real `target_id` (`$session->id` or a `CheckoutItem`'s own id) in the response — a merchant reading the Audit Log can see exactly *which* session an event happened to, even though the endpoint can't be *filtered* to one. Real action names confirmed via source: `checkout.started`, `checkout.reviewed`, `checkout.billing_address_set`, `checkout.shipping_address_set`, `checkout.item_added`, `checkout.item_quantity_increased`, `checkout.coupon_applied`, `checkout.submitted`, `checkout.submission_failed`, `checkout.recovered`, `checkout.expired` (this list is illustrative of what was directly observed reading the Actions above; a few more mutation types — remove item, remove coupon, shipping-option selection — exist but weren't individually quoted).

### 2.9 Permissions

Three real, dedicated keys, staff-gated only:

| Key | Grants |
|---|---|
| `checkout.sessions.view` | View checkout sessions (by known id) and shipping options |
| `checkout.sessions.manage` | Start, modify, review, submit, and recover checkout sessions |
| `checkout.audit_log.view` | View Checkout's own audit log |

**Confirmed via source: no customer-facing authentication guard exists anywhere on this platform yet.** `Authorization\PermissionRegistry`'s own docblock states this explicitly — every Checkout route requires the same staff `auth:sanctum` + `permission:` gate every other module uses. There is no storefront, and no customer-facing session today. This means every real checkout that has ever happened, or could happen right now, on this backend was driven by a staff-authenticated caller (an Admin session, a script, or a future storefront acting through a staff-equivalent credential the platform hasn't built yet).

## 3. Merchant Workflow — What This Backend Actually Supports for Admin

This is the section that most distinguishes Checkout from every prior phase. Thinking honestly about what a merchant or support agent could actually **do** with this real backend, through a real Admin UI:

1. **Investigate what happened to a specific, known checkout** — via the Audit Log's own real `target_id` on each row, a support agent could trace one session's full history (started → items added → address set → reviewed → submitted, or → abandoned). Genuinely useful, genuinely buildable.
2. **Look up one session's full current state by id** — `GET /checkout/sessions/{id}` returns everything (cart, addresses, shipping, coupon, totals, status) — useful once you already have an id (from the Audit Log, a support ticket, or a customer-provided reference), not useful for browsing.
3. **See the resulting Order** — once a session reaches `submitted`, its own `order_id` links directly to the real, already-built Order Detail page (Phase 2.6) — the natural, complete continuation of "what happened to this checkout" that this platform already has.
4. **What this backend does NOT support for Admin**: browsing "all open carts," "all abandoned carts today," or any list/dashboard view of checkout activity — there is no list endpoint. A merchant cannot "see who's currently checking out" or "see this week's abandoned-cart count" without either (a) a new backend list endpoint (out of scope — this document is research only) or (b) deriving it from the Audit Log's own `checkout.started`/`checkout.expired` rows, which is an approximation of session-level visibility built on an event log, not a real session list, and would need to be presented honestly as exactly that if ever built.
5. **Staff-driven manual checkout** (a staff member adding items to a cart, setting addresses, and submitting on a customer's behalf) is technically possible with the real write API — but this is functionally identical to "Manual Order Entry," which Orders' own architecture doc (§6.1) already named as a real, still-open, deliberately-deferred Product Owner decision. Building it here would be the same decision wearing a different module's clothes.

## 4. Checkout Workflow (the real, storefront-shaped flow this backend enables)

For completeness — not something this phase proposes building, but the shape a future storefront would drive:

1. Start a session (guest or registered) → `POST /checkout/sessions`.
2. Add/update/remove cart items → `POST/PATCH/DELETE .../items`.
3. Set billing + shipping address → `PUT .../billing-address`, `PUT .../shipping-address`.
4. Choose a shipping option from the real 3-tier flat-rate catalog → `PUT .../shipping-option`.
5. Optionally apply a coupon → `POST .../coupon`.
6. Review (recompute real price/tax/discount/shipping/grand totals) → `POST .../review`. Any further cart change bounces back to step 2–5 and invalidates the review.
7. Submit (the real 6-step saga: claim → reserve stock → resolve customer → redeem promotions → create Order → finalize) → `POST .../submit`. Idempotent under retry.
8. If abandoned, either wait for the sweep to mark it `expired`, or recover it later into a fresh session → `POST .../recover`.

This confirms the backend is fully storefront-ready. It has no relationship to what an *Admin* module for staff would look like (§3).

## 5. Information Architecture (for the narrow, real Admin surface this backend supports)

Given §3's findings, the honest Admin information architecture is deliberately small:

- **Checkout Audit Log** (`checkout/audit-log`, `checkout.audit_log.view`) — a dedicated, server-paginated screen, Type + Staff filters, identical shape to Orders' and Customers' own Audit Log screens (no `target_id` filter, since none exists). This alone gives a support team real, complete visibility into every checkout event that has ever happened.
- **Checkout Session Detail** (`checkout/sessions/:id`, `checkout.sessions.view`) — a read-only detail view (cart, addresses, shipping, coupon, totals, status, and — if `submitted` — a real link to the resulting Order Detail page), reachable only by navigating from an Audit Log row's own real `target_id` (no list page links to it, because none can). Every session-mutating action (add item, set address, submit, etc.) is deliberately **not** exposed here — building any of them would reopen the Manual-Order-Entry-shaped decision named in §3.5 and §6.1, not a passive "view" capability.

No List page is proposed, because none can honestly exist — there is nothing to list from.

## 6. Recommended Implementation Slices

**Slice 1 — Checkout Visibility (Audit Log + read-only Session Detail).** Exactly §5's two screens. Zero risk: every field is already confirmed real; nothing here writes anything. Gives merchants and support staff genuine, honest value (trace what happened to any checkout by id) without inventing a list capability the backend doesn't have or a manual-entry capability that's a separate, deliberately-deferred decision.

**No further slices are proposed without an explicit Product Owner decision on §6.1 below** — every additional capability this backend could technically support (starting/mutating/submitting a session from Admin) is the Manual Order Entry question in a different module's clothing, not a natural "Slice 2" the way Orders' own Fulfillment/Payments/Notifications visibility cards were (those were pure additional *read* surfaces on an already-complete Order Detail; Checkout has no equivalent "more to read" once Slice 1's two screens exist).

## 7. Risks & Product Owner Decisions

1. **Should Admin ever be able to drive a checkout session (start/add items/set address/submit) on a customer's behalf?** This is the real, load-bearing open question, structurally identical to Orders' own still-open "Manual Order Entry" decision (§6.1 of `PHASE_2_6_ORDERS_ARCHITECTURE.md`) — in fact, building Checkout's own write surface for Admin **is** a way to implement Manual Order Entry, just routed through Checkout's own saga instead of Orders' `POST /orders` directly. Recommend resolving both decisions together, not separately, since they're the same underlying product question.
2. **No customer-facing checkout exists anywhere on this platform yet** (§2.9) — every real checkout today is staff-driven by construction, not by choice. A future storefront needs its own authentication guard (named explicitly in `PermissionRegistry`'s own docblock as future work) before a genuine customer self-service checkout can exist. This is a **backend/platform decision**, well outside a frontend-only phase's scope, but worth surfacing: today, "guest checkout" on this platform means a *staff member* checking out *as* a guest, not a real anonymous shopper.
3. **`CheckoutAbandoned`/`CheckoutStarted`/`CheckoutCompleted` all have zero subscribers today** — no marketing/CRM re-engagement flow exists for abandoned carts (the Growth & Automation domain this event anticipates is not yet built, per the master plan's own Evolvable-module list). Not a frontend concern; flagged for product/backend visibility only.
4. **No date-range or status filter on anything Checkout-related** — consistent with the same real, already-documented gap on Orders' own list (which at least has a list to filter). Not fixable from the frontend.
5. **Building only Slice 1 (§6) risks feeling anticlimactic after Orders' own two full slices** — worth setting expectation with the Product Owner explicitly: this is not a research shortfall, it's an honest reflection of what this specific backend was designed to support for a staff Admin surface, confirmed by direct, thorough source reading, not inferred from a gap in this research pass.

## 8. Readiness Score

**9/10 for the backend itself; ready to implement Slice 1 (Checkout Visibility) immediately** on the same "build only what's real" discipline this engagement has followed for every prior phase. The one point held back is entirely the open Product Owner decision in §7.1 (Admin-driven checkout / Manual Order Entry), which does not block Slice 1 and can be resolved independently, at any time, without touching anything Slice 1 ships.

---

*Research only, per this phase's own explicit instruction. No implementation. Stopping here pending separate Product Owner direction on Phase 2.7's build authorization.*
