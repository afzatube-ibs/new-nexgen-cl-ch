# Milestone 15 — Order Notifications Cross-Module Visibility Fix — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`, verified against the actual repository per the standing instruction. Not a planned milestone — a real, disclosed gap named independently by two earlier freeze audits (`PROJECT_STATUS.md` rows 30 and 35, both predating the Production Completion Plan v2 initiative), closed here under the same "continue to the next highest-priority item" instruction.

## Part 0 — What Was Found (Re-Confirmed, Not Assumed)

Both the Shipping Freeze Audit and the Payments Freeze Audit independently found, live, that a real shipment-dispatch/delivery notification and a real payment-receipt notification each genuinely exist and queue correctly (confirmed by each audit via direct database query at the time), yet neither ever appeared on Order Detail's own `OrderNotificationsCard`. Both audits correctly diagnosed the root cause without fixing it (out of scope for those modules' own freeze passes): the card queried Notifications' real `GET /notifications?related_type=order&related_id=` — but `related_id` for a payment or shipment notification is that Payment's or Shipment's own id, **never the parent Order's** (confirmed again here by re-reading `SendPaymentReceiptOnPaymentCaptured`/`SendShipmentNoticeOnShipmentDispatched` directly), so the order-scoped query could never match them by construction, not by an accident that only manifests occasionally.

**Classification**: **A real, correctly-diagnosed, previously-unfixed gap** — every underlying capability (the notifications themselves, the backend's own `related_type`/`related_id` filter pair, the already-real `useOrderShipments`/`useOrderPayments` queries the sibling cards already use) was already real and correct; only the Notifications card's own query was too narrow.

## Part 1 — What Shipped

- `packages/api-client/src/notifications/types.ts`: `PAYMENT_RELATED_TYPE`/`SHIPMENT_RELATED_TYPE` constants alongside the existing `ORDER_RELATED_TYPE`.
- `apps/admin/src/modules/orders/shared/queries.ts`: `useOrderNotifications` now fetches the order's own real shipments and payments first (the identical, already-real queries the Fulfillment/Payments cards use), issues one notification lookup per real payment/shipment id, and merges every result with the order-level notifications into one list.
- `apps/admin/src/modules/orders/shared/mergeNotifications.ts` (new): the merge/sort step extracted into a small, pure, independently-tested function — chronological (newest-first) across all three sources.
- `apps/admin/src/modules/orders/detail/OrderNotificationsCard.tsx`: renders the merged list, with a small "Payment"/"Shipment" label on any notification that isn't order-level, so a merged list stays legible.
- Graceful degradation, matching this module's own established `useCustomerName` precedent: a caller lacking `payments.payments.view`/`fulfillment.shipments.view` (independent permissions from this card's own `notifications.notifications.view`) simply never learns those ids and falls back to exactly today's order-only behavior — never a hard error, never worse than before.

## Part 2 — Verification

| Check | Result |
|---|---|
| `api-client` typecheck | Clean |
| Admin typecheck/lint | Clean |
| Admin unit tests | **165/165** (5 new for `mergeNotifications`) |
| Admin production build | Clean |

### Live, end-to-end verification (real backend + real Admin + real browser)
Found a real order (`ORD-20260815-4FCFCC56`) with a real, pre-existing `related_type=payment` notification via a direct database query, logged into the real Admin UI as a temporary, purpose-created staff account, and confirmed the Notifications card now shows **both** the real order-confirmation notification (queued Aug 15) **and** the real payment-receipt notification (queued Aug 17, labeled "Payment") — sorted newest-first, exactly as designed. This is the identical order and the identical notification the original Payments Freeze Audit found existed in the database but could not see in the Admin UI. Confirmed no regression via a full, uncached page reload. Cleaned up the temporary staff account afterward.

## Part 3 — Final Classification

**Production ready.** Closes a real, twice-independently-disclosed gap with a minimal, targeted change — no new endpoint, permission, or business rule; every underlying capability was already real.

## Part 4 — Roadmap Correction

Added to `PRODUCTION_COMPLETION_PLAN_v2.md` as Milestone 15.

---
