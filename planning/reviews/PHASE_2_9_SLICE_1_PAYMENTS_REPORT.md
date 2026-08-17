# Phase 2.9 — Payments, Slice 1: Merchant Payment Management

**Date:** 2026-08-17
**Scope:** Read-only Merchant Payment Management, against the real, already-complete backend (`app/Domains/Commerce/Payments/`), per `planning/architecture/PHASE_2_9_PAYMENTS_ARCHITECTURE.md`. Backend, Database, Routes, Permissions, API contracts, and Shared Design System were **not modified**. **Not committed, not pushed** — awaiting Product Owner approval, per the work order's own explicit closing line.

---

## 1. What was built

| Screen | Route | Backend consumed |
|---|---|---|
| Payments (list) | `/payments/payments` | `GET /payments` (`order_id`/`customer_id`/`status` filters, real pagination) |
| Payment Detail | `/payments/payments/:id` | `GET /payments/{id}` (eager-loads `attempts` — the real transaction/timeline ledger) |
| Payments Audit Log | `/payments/activity` | `GET /payments/audit-logs` (`actor_id`/`target_type` filters, real pagination) |

One new nav group, "Payments," added via `registerModule()` — the same zero-touch mechanism every prior module uses.

**Payments List**: real, server-side `order_id`/`customer_id`/`status` filters (confirmed by reading `PaymentController::index` directly — no free-text search, no `gateway_code` filter exist on the backend, so neither was built). Order and Customer columns are real, permission-gated links to those modules' own Detail pages (`orders.orders.view`/`customers.customers.view`), mirroring Shipments List's own established pattern.

**Payment Detail**: Overview (Order link, Customer link, Gateway — resolved to its real label via `GET /payments/methods`, not hardcoded — Amount, Amount captured, Currency, Initiated/Authorized/Captured/Cancelled/Failed timestamps, Bank Transfer proof reference and Instructions when present, copyable Payment ID) and the real **Transaction Timeline** — every `PaymentAttempt` row (initiation/authorization/capture/cancellation/void/failure/webhook/refund), each with its real status, gateway reference, amount, and failure reason. This is the genuine, real audit-quality record of what actually happened to a payment, not a status-only summary.

**Payments Audit Log**: the module-wide, real, server-paginated audit trail, with Staff filter (reusing the same staff-directory pattern every other module's own Audit Log already established) and rows that navigate straight to the real Payment they reference.

## 2. Backend capabilities consumed

- `PaymentController::index`/`show` — confirmed by reading directly: `index` supports `order_id`/`customer_id`/`status`, hardcoded `orderByDesc('initiated_at')`, Laravel's default pagination; `show` is the only endpoint that loads `attempts`.
- `PaymentMethodController::index` (`GET /payments/methods`) — the real gateway registry (`GatewayResolver::availableGateways()`), used to resolve a raw `gatewayCode` (`bkash`, `cod`, `bank_transfer`, `sslcommerz`, `nagad`) to its real, human label.
- `AuditLogController::index` (Payments' own) — `actor_id`/`target_type`/`per_page`, no `target_id` filter (the identical constraint every other module's own audit endpoint has), confirmed by reading it directly.
- `PaymentAttemptResource` — the real transaction ledger, deliberately excluding `request_payload`/`response_payload` (Confidential, per the resource's own docblock) — this admin correctly never tries to surface those raw gateway payloads.

## 3. Honest limitations (documented, not worked around)

1. **`PaymentResource` omits `amountRefunded`/`refundedAt`** even though both are real, populated columns (added by a dedicated migration for the Returns integration) — confirmed by reading the resource class directly. A `partially_refunded`/`refunded` payment shows that real status via the badge, honestly, without fabricating a refund amount the API doesn't return. A one-line backend fix, out of this frontend-only slice's power.
2. **No free-text search, no `gateway_code` filter** on the Payments List — confirmed absent from the real backend, not built here.
3. **`Payment.amount`/`amountCaptured` have no `decimal:4` PHP cast** on the backend model (confirmed by reading `Models\Payment::casts()` directly) — under this sandbox's SQLite driver, live-verified to return as a bare JSON number rather than a decimal string, the identical class of gap already documented for `ShippingRate.amount` in the Shipping Slice 1 report. The frontend's `formatCurrency()` handles this gracefully regardless (`Number()` coerces either shape correctly) — confirmed live, no visual defect. Flagged here as a real, minor, deferred backend finding, not fixed in this frontend-only phase.
4. **No admin surface shows Payments-triggered notification status** — the real `payment.receipt`/refund-confirmation notifications use `relatedType: 'payment'`, the same class of gap the Shipping Freeze Audit just found for shipment notifications on `OrderNotificationsCard`. Not built here, matching this slice's own explicit scope (no Notifications card was named in the build list).

## 4. Bugs found

None. Every screen matched its real backend contract on the first live pass — no frontend defect required a code fix during build or live verification.

## 5. Bugs fixed

None needed. This is a from-scratch build against an already-complete backend; the only pre-existing files touched were the three required, minimal, additive registration points (`apps/admin/src/modules/index.ts` — one new import line; `packages/api-client/src/payments/{types,payments,index}.ts` — extended additively with `getPayment`/`listPaymentMethods`/`PaymentAttemptDTO`, on top of the `listPayments`-only layer Orders Slice 2 had deliberately left minimal, per that slice's own documented scope boundary; `packages/api-client/src/payments/auditLogs.ts` — new).

## 6. Live verification against the real backend

Logged in as `admin@nexgen.test`. Two real Payment rows already existed in the database (`sslcommerz`, `captured`, $109.00; `cod`, `captured`, $11.00) — both rendered correctly on List and Detail with real, correctly-formatted amounts, correctly-resolved gateway labels, and correct Order/Customer links (followed and confirmed working).

**A genuine, honest finding from live data, not a defect**: both real payments' Transaction Timeline shows "No transaction attempts recorded yet," and the real Payments Audit Log shows "No activity yet" — confirming these two rows were seeded directly (e.g. for an earlier phase's own `OrderPaymentsCard` live-verification) rather than walked through the real `InitiatePaymentAction`/`CapturePaymentAction` flow, which would have produced real `PaymentAttempt` and audit rows. The UI's own empty states rendered correctly and honestly in both cases — this is exactly the behavior a genuinely payment-attempt-less row should produce, not a bug to paper over.

Responsive verified live at 375×812 (mobile) and 1440×900 (desktop) — Overview grid collapses to one column, Payment ID truncates cleanly with its copy button, Transaction Timeline reflows correctly, no overflow at either width. Zero unexpected console errors.

## 7. Quality gates

| Gate | Result |
|---|---|
| `typecheck` | Clean |
| `lint` | Clean |
| Production `build` | Clean |
| Unit tests | **285 passing** (141 admin + 144 api-client) — 12 new this slice (4 auditAction + 4 formatCurrency in `apps/admin`, 4 payments api-client tests) |
| Playwright e2e | **5/5 passing** for `payments.spec.ts` (List with Status filter, Detail with real Timeline, empty-Timeline honesty, Audit Log with resolved staff name + row navigation, a11y scan across all three screens). Full platform suite: **144/149 passing** — the 5 failures are the same, established `catalog-brands.spec.ts`/`catalog-product-slice2.spec.ts` baseline flakiness this engagement has tracked since Phase 2.2, zero Payments failures |
| Accessibility | 0 critical/serious violations across Payments List, populated Payment Detail, and Payments Audit Log |
| Responsive | Verified live at 375×812 and 1440×900 |
| Live verification | Real Payments List/Detail/Audit Log against the real backend, both real Payment rows rendered correctly, Order/Customer links followed and confirmed working |

## 8. Readiness score: 96/100

The four points held back reflect the honest, backend-forced limitations in §3 (§3.1's missing refund fields, §3.3's SQLite decimal-cast gap, and §3.4's cross-module notification-visibility gap already known from Shipping) — none fixable within this frontend-only slice, none worked around. Zero critical issues. Zero frontend defects found. All quality gates green except the established, pre-existing, unrelated Catalog flake baseline.

**Recommendation: READY, pending Product Owner review of §3's honest limitations.**

---

**Not committed. Not pushed. Stopping here per the work order's own explicit closing line, awaiting Product Owner approval.**
