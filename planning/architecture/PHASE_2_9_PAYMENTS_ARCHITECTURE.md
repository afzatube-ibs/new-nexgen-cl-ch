# Phase 2.9 — Payments: Architecture Research

**Date:** 2026-08-17
**Scope:** Research only. No frontend, no backend, no commits, no pushes this phase. Every claim below is sourced from a direct reading of the real backend code — models, controllers, requests, resources, routes, permissions, events, gateways, audit, and existing tests — under `apps/backend/app/Domains/Commerce/Payments/`, plus the cross-domain listeners in `apps/backend/app/Listeners/`.

---

## 1. Backend Readiness Score: 9/10

Payments is a complete, mature, real module — the deepest gateway-integration surface in this codebase. A real aggregate (`Payment`) with a correctly-modeled, gateway-agnostic status lifecycle; a real, append-only transaction ledger (`PaymentAttempt`); 5 real gateway implementations behind one clean contract; real webhook processing with signature verification; a real audit trail; a narrow, well-reasoned permission model. The one point held back: `PaymentResource` — the API's own read surface — omits `amountRefunded`/`refundedAt` even though both are real, populated columns (§5), a genuine small gap between what the aggregate tracks and what a caller can currently read back.

## 2. Real Backend Capabilities

### 2.1 The `Payment` aggregate

`Models/Payment.php` — one row per payment attempt-cycle against an Order (an Order may have **many** Payment rows over its lifetime — a failed bKash attempt followed by a successful COD selection is two rows, never one retried row — but never more than one concurrently *active* [`pending`/`authorized`] Payment, enforced by `InitiatePaymentAction`'s own row-locking, not a DB constraint). Fields: `order_id`/`customer_id` (plain identifier snapshots, never foreign keys — the exact same pattern every other module in this platform uses), `gateway_code`, `currency_code`, `amount` (a one-time snapshot of the Order's own `grand_total` at initiation — Payments never recalculates it), `amount_captured`, `amount_refunded`, `status`, `idempotency_key` (client-supplied duplicate-submission guard for `initiate` specifically), `proof_reference` (Bank Transfer's proof-upload extension point — a nullable, by-identifier-only reference), `redirect_url`/`instructions` (the gateway-agnostic, already-normalized post-initiation surface — a hosted-checkout redirect target, or COD's/Bank Transfer's plain-text instructions), `failure_reason`, and five real lifecycle timestamps. `HasOptimisticLocking` (`lock_version`) + `HasUuids`.

**Status lifecycle**, a one-directional graph with early exits:

```
pending -> authorized -> captured -> partially_refunded -> refunded
   \            \             \______________________________/
    ------------> failed / cancelled / voided
```

`captured` was the aggregate's original one success terminal state; `partially_refunded`/`refunded` are additive exits added when the Returns module was built (§2.6) — no existing column, status value, or caller's shape changed to add them, the same additive pattern Shipping's own `ShippingProviderContract` used when Fulfillment needed `bookShipment()`. Cash On Delivery's own "Confirmed" vocabulary and Bank Transfer's own "Approved" vocabulary both map onto `captured` — neither gateway invents a parallel status any caller elsewhere in this module needs to special-case.

### 2.2 `PaymentAttempt` — the real Transaction/Timeline ledger

`Models/PaymentAttempt.php` — an append-only ledger merging "Payment Transactions" and "Payment Attempts" into one table (confirmed via the migration's own docblock), `UPDATED_AT = null`, no `lock_version`, no update path anywhere in this module. One row per real lifecycle event: `type` (`initiation`/`authorization`/`capture`/`cancellation`/`void`/`failure`/`webhook`/`refund`), `status` (`pending`/`succeeded`/`failed`), `gateway_code`, `gateway_reference`, `amount`, `currency_code`, `failure_reason`, `occurred_at`, plus `request_payload`/`response_payload` (JSON — a gateway's raw request/response, **excluded from the ordinary read resource**, see §2.3). This is the exact, real data source for a "Payment Timeline"/"Transaction Information" UI — `GET /payments/{id}` eager-loads `attempts`.

### 2.3 API surface (`routes.php`, all under `auth:sanctum`)

| Endpoint | Permission | Purpose |
|---|---|---|
| `GET payments` | `.view` | List — real `order_id`/`customer_id`/`status` filters, `orderByDesc('initiated_at')`, Laravel default pagination. **No free-text search, no `gateway_code` filter** — confirmed by reading the controller directly. |
| `GET payments/{id}` | `.view` | Detail — eager-loads `attempts` (the real Timeline). |
| `POST payments` | `.manage` | Initiate — a write action, out of Slice 1 scope. |
| `POST payments/{id}/capture` | `.manage` | Manual capture (COD "cash collected", Bank Transfer approval's own internal call) — write, out of scope. |
| `POST payments/{id}/cancel` | `.manage` | Write, out of scope. |
| `POST payments/{id}/void` | `.manage` | Write, out of scope. |
| `POST payments/{id}/bank-transfer/proof` | `.manage` | Write, out of scope. |
| `POST payments/{id}/bank-transfer/approve` \| `/reject` | `.bank_transfer.verify` | Write, out of scope — internally reuses `CapturePaymentAction`/`MarkPaymentFailedAction`, no separate audit-action strings. |
| `GET payments/methods` | `.view` | Real gateway registry (`{code, label}` per available gateway) — the Payments analog of Shipping's own Provider Registry. |
| `GET payments/audit-logs` | `.audit_log.view` | Same flat, filterable (`actor_id`/`target_type`, no `target_id`), paginated shape as every other module. |
| `POST payments/webhooks/{sslcommerz,bkash,nagad}` | none (unauthenticated by design) | Gateway-initiated; `throttle:payments-webhooks` + the Action's own signature verification are the real trust boundary — not this admin's concern. |

**`PaymentResource`'s own read surface is narrower than the aggregate**: `amountRefunded` and `refundedAt` are real, populated columns (added by a dedicated migration for the Returns integration, §2.6) but **are not included in `PaymentResource::toArray()`** — confirmed by reading the resource class directly. A payment that is genuinely `partially_refunded`/`refunded` shows that status, but this admin (or any caller of this endpoint) cannot currently read how much was refunded or when, from this resource. Documented honestly here, not worked around — flagged as a real, small, future backend fix (adding two fields to one resource), out of this frontend-only phase's power.

`PaymentAttemptResource` **deliberately excludes** `request_payload`/`response_payload` — a gateway's raw request/response is Confidential audit data, available only through `payments.audit_log.view`, not the ordinary read surface (per the resource's own docblock, citing `DATA:CLASSIFICATION`'s "protection travels with the data itself").

### 2.4 Permissions (4 keys, `Authorization/PermissionRegistry.php`)

`payments.payments.view`, `payments.payments.manage`, `payments.bank_transfer.verify` (deliberately separate from `.manage` — approving a manual bank transfer is the one operation in this module with no automated, gateway-verified counterpart at all; a human's word alone moves an Order into `captured`), `payments.audit_log.view`. Materially simpler than Shipping/Fulfillment's granular set — a plain `view`/`manage` pair plus two specialized keys, closer to Orders' own shape.

### 2.5 The 5 real gateways (`Gateways/*Gateway.php`, one contract: `PaymentGatewayContract`)

| `code()` | `label()` | Notes |
|---|---|---|
| `cod` | Cash On Delivery | Bangladesh-first, first-class gateway; capture happens only after delivery, by design (see Shipping's own architecture doc §2.7 for why Fulfillment doesn't wait on `PaymentCaptured`). |
| `bank_transfer` | Bank Transfer | No automated callback — capture/reject is entirely the human-driven `BankTransferVerificationController` flow. |
| `bkash` | bKash | Implements `RefundableGateway` too. Real, documented API shape; retry-safe by the gateway's own idempotent `paymentID`. |
| `nagad` | Nagad | Real, documented API shape; retry-safe via `paymentReferenceId`. |
| `sslcommerz` | SSLCommerz | Verifies webhooks by re-querying the Order Validation API (`val_id`), not payload signing — SSLCommerz doesn't offer one for this flow. |

`GET payments/methods` returns exactly this table, live, gated on `.view` — the correct source for a gateway-code→label lookup, not a hardcoded frontend map.

### 2.6 Refunds are Returns' concern, confirmed structurally

`RefundPaymentAction` exists and is real, but **no route exposes it as a generic admin action** — the only two ways a `PaymentRefunded` event fires are (a) `Returns\Actions\ProcessRefundOnReturnResolved` (a cross-domain listener, Returns-initiated) and (b) `CompleteRefundOnPaymentRefunded`'s own reverse-direction listener completing the matching `RefundRequest`. `RefundableGateway`'s own docblock states this explicitly: "full refund workflow... is Returns' concern... this interface is the seam that future module extends, not a reimplementation of it now." Confirms the master instruction's own "Do NOT build: Refunds" is not just a scope preference — the backend genuinely has no admin-facing refund endpoint to wrap.

### 2.7 No automatic `OrderPlaced` trigger — a real, notable architectural difference from Shipping

Unlike Fulfillment's `CreateShipmentOnOrderPlaced`, **nothing automatically initiates a Payment when an Order is placed** — confirmed by an exhaustive search for every caller of `InitiatePaymentAction`: only `PaymentController::store()` calls it. Payment initiation is a direct, explicit `POST /payments` call — architecturally sound, since payment method selection genuinely requires a customer decision at checkout that fulfillment does not; not a gap, just a real difference worth naming so it isn't assumed to mirror Shipping's pattern.

### 2.8 Notifications integration (real, and — unlike Shipping's own finding — reachable)

`SendPaymentReceiptOnPaymentCaptured` (on `PaymentCaptured`, template `payment.receipt`, `relatedType: 'payment'`), `SendRefundConfirmationOnPaymentRefunded`, `SendRefundIssuedOnRefundIssued` (Returns-side) — all wrapped in the same non-blocking try/catch pattern every notification listener in this platform uses. Notable: these use `relatedType: 'payment'`, which is the SAME `related_type` key Orders' own `OrderNotificationsCard` queries for `related_type=order` — meaning a Payments-triggered notification is **not** visible on Order Detail either (the identical class of gap the Shipping Freeze Audit just found for shipment notifications), confirmed by the same code-reading method, not re-tested live this phase. Not a bug in Payments; a note for whoever eventually addresses the Orders-side gap.

### 2.9 Existing tests (confirmed present)

`PaymentInitiationTest`, `PaymentActionTest`, `BankTransferVerificationTest`, `PaymentMethodTest`, `WebhookTest`, `AuditLogTest` (Feature); `RefundPaymentActionTest`, `PermissionRegistryTest`, five gateway unit tests, `HasOptimisticLockingTest`, `PaymentTest` (Unit), plus `CompleteRefundOnPaymentRefundedTest` under `tests/Unit/Listeners/`. A real, non-trivial suite — not greenfield backend code.

---

## 3. Merchant Workflow

A merchant reviewing Payments today needs to answer three real questions this admin currently has no way to answer: **"Did this order get paid?"** (Payment List/Detail, `status`), **"What actually happened, step by step?"** (`PaymentAttempt` ledger — the real Timeline), and **"Who approved this bank transfer, and when?"** (the audit log, plus `payments.bank_transfer.verify`'s own narrower grant). Order Detail's own `OrderPaymentsCard` (Orders Slice 2, frozen) already gives a summary glimpse read-only from Order Detail's side; Payments Slice 1 gives the reverse and more complete view — a dedicated List/Detail surface a merchant reaches directly, with the full transaction ledger, not just a status badge.

## 4. Information Architecture

```
Payments (nav group)
├── Payments        — list (order_id/customer_id/status filters) + detail (Fulfillment's own read-only List/Detail shape is the closest precedent)
│     └── Detail: Overview (amount/currency/gateway/status), Transaction Timeline (real PaymentAttempt ledger), Customer link, Order link
└── Payments Activity — the real audit log
```

`GET payments/methods` (gateway labels) is consumed as a lookup, not a separate nav page — Shipping's own "Providers" screen was recommended but never actually built in Slice 1 (confirmed absent, flagged in the Shipping Freeze Report §3.5); Payments Slice 1 will not repeat that half-built recommendation — gateway labels are resolved inline on List/Detail rows via the real endpoint, nothing more, unless the Product Owner asks for a dedicated view later.

## 5. Recommended Slices

**Slice 1 — Merchant Payment Management (this phase, immediately following this document, per the master instruction's own "without waiting" direction).** Payments List (server-filtered by `order_id`/`customer_id`/`status`, real pagination), Payment Detail (Overview, real Transaction Timeline from `attempts`, Customer link, Order link), Payments Audit Log, permission gating on the real `payments.payments.view`/`payments.audit_log.view` keys. Read-only — no Initiate/Capture/Cancel/Void/Refund/Bank-Transfer-verification UI, matching the master instruction's own explicit "Do NOT build" list and mirroring exactly how Shipping's own Slice 1 scoped Shipments to read-only before Slice 2/3 added workflow actions.

**Not recommended this phase, named explicitly rather than silently skipped**: any write action (Initiate/Capture/Cancel/Void/Bank-Transfer approve-reject — all real, but this slice is read-only by the master instruction's own boundary), a dedicated Gateway/Payment-Methods registry page (available via `GET payments/methods` but not asked for), a Notifications card on Payment Detail (the real `related_type=payment` data exists, per §2.8, but wasn't named in the Slice 1 build list — the same "document, don't silently expand" discipline the Shipping Freeze Audit just applied to its own equivalent finding).

## 6. Product Owner Decisions

None required to proceed — the master instruction already scopes Slice 1 precisely, and every capability it asks for (List, Detail, Timeline, Status, Audit, Transaction Information, Customer link, Order link, Search/Filters/Pagination, permission gating) maps directly onto a real, already-existing backend capability confirmed above. One open item worth surfacing for a future decision, not blocking this slice: whether `PaymentResource`'s missing `amountRefunded`/`refundedAt` fields (§2.3) should be added to the backend resource — a one-line fix, out of this frontend-only engagement's power to make unilaterally.

## 7. Known Backend Limitations

- `PaymentResource` omits `amountRefunded`/`refundedAt` despite both being real, populated columns (§2.3).
- No automatic `OrderPlaced → Payment` trigger — payment initiation is always an explicit, external call (§2.7).
- No admin-facing refund endpoint — refunds are entirely Returns' concern (§2.6).
- No free-text search on the Payments List endpoint, and no `gateway_code` filter (§2.3).
- Payments-triggered notifications (`relatedType: 'payment'`) are not visible on Order Detail's own `OrderNotificationsCard`, the identical class of gap the Shipping Freeze Audit just found for shipments (§2.8) — not a Payments defect, a note for whoever revisits Orders.

---

**Research only. No frontend, no backend, no commits, no pushes were made this phase. Proceeding immediately to Slice 1 per the master instruction's own explicit "without waiting" direction.**
