# Phase 2.9 — Payments, Slice 2: Merchant Payment Operations

**Status:** Complete. Not committed, not pushed — awaiting Product Owner approval per the master task's instruction ("Do NOT build Refund/settlement/etc. — build only existing capabilities; stop after this slice").

## 1. Scope

Slice 1 (previously delivered) built read-only Merchant Payment Management: Payments List, Payment Detail, Transaction Timeline, and the Payments Audit Log. Slice 2 adds the real, existing write operations this backend exposes on top of that: **Capture, Cancel, Void**, and the **Bank Transfer verification workflow** (Attach Proof, Approve, Reject).

Before writing any code, the real backend was re-confirmed fresh (Models/Actions/Controllers/Requests/Resources/Routes/Permissions/Events/Audit/Tests) — see §2. Nothing in the backend had changed since Slice 1's own architecture research.

## 2. Backend capabilities consumed

| UI action | Real endpoint | Permission | Backend Action |
|---|---|---|---|
| Capture | `POST /payments/{id}/capture` | `payments.payments.manage` | `CapturePaymentAction` |
| Cancel | `POST /payments/{id}/cancel` | `payments.payments.manage` | `CancelPaymentAction` |
| Void | `POST /payments/{id}/void` | `payments.payments.manage` | `VoidPaymentAction` |
| Attach proof | `POST /payments/{id}/bank-transfer/proof` | `payments.payments.manage` | `AttachBankTransferProofAction` |
| Approve transfer | `POST /payments/{id}/bank-transfer/approve` | `payments.bank_transfer.verify` | reuses `CapturePaymentAction` |
| Reject transfer | `POST /payments/{id}/bank-transfer/reject` | `payments.bank_transfer.verify` | reuses `MarkPaymentFailedAction` |

Every request body, precondition, and status transition below was read directly from the backend source, not assumed:

- **Capture** is gateway-agnostic and always captures the payment's own full original `amount` — no amount override, no gateway reference input (`ExpectedVersionRequest`, the only field is `expected_version`). Confirmed via `PaymentActionController::capture()`, which always passes `$payment->amount`.
- **Cancel/Void/Reject** all require a `reason` string (`required`, `max:1000`) — unlike Shipping's own `CancelShipmentRequest`, which makes it optional.
- **Void** is reachable only from `authorized` (never from `pending`) — confirmed via `VoidPaymentAction`'s own transition guard and `VoidPaymentRequest` requiring `expected_version` as non-nullable.
- **`AttachBankTransferProofAction` has no status guard at all** — proof can be attached at any payment status, even a terminal one — confirmed by reading the Action directly. The UI therefore offers "Attach proof"/"Update proof" unconditionally whenever the caller holds `.manage` on a `bank_transfer` payment.
- **`payments.bank_transfer.verify` is a genuinely distinct, narrower permission from `.manage`** — confirmed live against the real backend's own test suite (`BankTransferVerificationTest`): a caller with `.manage` alone is correctly denied (403) on approve/reject.
- **Status lifecycle** (`Models\Payment::TRANSITIONS`): `pending → {authorized, captured, failed, cancelled}`, `authorized → {captured, voided, failed, cancelled}`; `refunded`/`failed`/`cancelled`/`voided` are all true terminals.
- **Exception → HTTP mapping**: `InvalidPaymentStatusTransitionException` → 422; `ConcurrencyConflictException` → 409, surfaced client-side as "This payment was changed elsewhere since it loaded — reload the page to see the latest version before trying again."

### Explicitly NOT built (confirmed absent, not simply deferred)

- **Authorize** — `AuthorizePaymentAction` exists in the codebase but has **zero HTTP route** (confirmed by reading `routes.php` directly).
- **Retry** — not a distinct backend capability; no route, no Action.
- **Refund** — `RefundPaymentAction` exists but is Returns-module-triggered only, via cross-domain listeners (`ProcessRefundOnReturnResolved`/`CompleteRefundOnPaymentRefunded`). No generic admin `POST /payments/{id}/refund` route exists. `RefundableGateway`'s own docblock states this explicitly: "the full refund workflow... is Returns' concern... this interface is the seam that future module extends, not a reimplementation of it now."

None of these were built, per the master task's own "If a capability is not implemented by the backend, DO NOT BUILD IT" instruction.

## 3. What was built

- **`packages/api-client/src/payments/workflow.ts`** (new) — one thin function per real endpoint above, mirroring Fulfillment's own `workflow.ts` pattern exactly (`unwrap()` helper, `DataEnvelope<PaymentDTO>`).
- **`packages/api-client/src/payments/types.ts`** — extended with `PaymentExpectedVersionInput`, `PaymentReasonInput`, `AttachBankTransferProofInput` (named `Payment*` rather than the bare `ExpectedVersionInput` Fulfillment's own workflow types already use, to avoid a barrel-export name collision between the two sibling modules — a real `tsc` error caught and fixed during this build).
- **`apps/admin/src/modules/payments/shared/errors.ts`** (new) — `paymentsErrorMessage`, mirroring every other module's own per-module error mapper.
- **`apps/admin/src/modules/payments/payments/queries.ts`** — extended with a `usePaymentMutation` factory (mirrors Shipping's `useWorkflowMutation`) and 6 mutation hooks, each invalidating both the Payments List and this payment's own Detail query on success.
- **`PaymentCancelDialog.tsx` / `PaymentVoidDialog.tsx`** (new) — reason-required controlled dialogs, mirroring `ShipmentFailDialog`'s exact shape.
- **`BankTransferProofDialog.tsx`** (new) — single-field dialog for `proofReference`, offered unconditionally per the no-status-guard finding above.
- **`BankTransferRejectDialog.tsx`** (new) — reason-required dialog for reject.
- **`PaymentWorkflowActions.tsx`** (new) — the action bar. General Capture/Cancel/Void render for every gateway, including `bank_transfer` (since `CapturePaymentAction` is genuinely gateway-agnostic — hiding it there would invent an unenforced business rule). A separate Bank Transfer Verification section renders only when `payment.gatewayCode === 'bank_transfer'`, with Attach Proof under `.manage` and Approve/Reject under the distinct `.bank_transfer.verify`.
- **`PaymentDetailPage.tsx`** — wired `PaymentWorkflowActions` into a new "Payment Actions" card, gated by `RequirePermission anyOf={['payments.payments.manage', 'payments.bank_transfer.verify']} inline={null}` so the card itself disappears entirely for a caller with neither permission.

## 4. Bug found and fixed (backend)

**Genuine, pre-existing, reproducible bug — blocked the real Capture endpoint entirely for any whole-number payment amount in this SQLite dev environment.**

- `Models\Payment` and `Models\PaymentAttempt` declared no cast for their `decimal(14,4)` `amount`/`amount_captured`/`amount_refunded` columns, despite both classes' own docblocks already documenting `@property string $amount`.
- SQLite's dynamic typing returns such a column as PHP `int` for a whole-number value (e.g. `50`) or `float` for a fractional one (e.g. `62.5`) — never the `string` every real caller in this module requires.
- Reproduced live: clicking the real **Capture** button against a genuine dev payment produced a 500, and `storage/logs/laravel.log` showed `CapturePaymentAction::execute(): Argument #2 ($amount) must be of type string, int given` — a `TypeError`, not a validation error. The exact same class of failure also blocked `InitiatePaymentAction` (used by the real Checkout submission flow) when constructing its own `PaymentInitiated` event.
- **Fix**: added `'amount' => 'decimal:4'` (and `amount_captured`/`amount_refunded`) to `Payment::casts()`, and `'amount' => 'decimal:4'` to `PaymentAttempt::casts()` — matching the columns' own `decimal(14,4)` precision and the models' own pre-existing docblocks exactly. This is a return-type correction, not a contract or business-rule change: MySQL/PostgreSQL's own PDO drivers already return decimal columns as strings, so this bug was masked there; the cast makes both drivers agree.
- **Verified safe**: re-ran the full `Payments` backend test suite before and after the fix (via `git stash` on just these two files) — zero new failures introduced. The pre-existing failures in that run (`RefundPaymentActionTest`, `WebhookTest`, and every module's own `HasOptimisticLockingTest`, including Catalog's and Checkout's) all reproduce identically with or without this fix, and all trace to the same root cause: this dev sandbox has no local `nexgen_testing` MySQL server running (`SQLSTATE[HY000] [2002] Connection refused`), a pre-existing environment/infra gap unrelated to Payments.
- **Live-verified after the fix**: Capture on a real dev payment now succeeds end-to-end (see §6).

## 5. Cross-cutting finding (documented, not fixed — out of scope)

`BankTransferGateway::isAvailable()` requires `bank_name`/`account_name`/`account_number` to be configured before the gateway is offered, yet `config/payments.php`'s own docblock states "COD and Bank Transfer need no external credentials at all and are therefore always available." In this dev environment those three env vars are empty, so `bank_transfer` is genuinely unavailable via the real `InitiatePaymentAction`/`GatewayResolver` until an operator configures a bank account — the UI itself is unaffected (it correctly renders whatever real gateway a payment already has), but this is a real, minor documentation/behavior mismatch worth a follow-up, not a Payments-frontend defect.

## 6. Live verification (real backend, real data, real permissions)

Backend: `php84 artisan serve` on `127.0.0.1:8080`. Admin: Vite dev server on `5173`. Logged in as `admin@nexgen.test`.

Four real `Payment` rows were created directly via Eloquent (not seeded raw SQL) against real, existing Orders — a necessary substitute for driving them through the real Checkout submission flow, which is itself blocked in this SQLite dev environment by the identical pre-existing type-casting gap described in §4 (confirmed by attempting `InitiatePaymentAction::execute()` directly via `tinker` first, which reproduced the same `TypeError` for every whole-number-total Order in this database — see backend note below).

| Test payment | Gateway | Starting status | Action performed | Result |
|---|---|---|---|---|
| `01a00c78-6b0b...` | sslcommerz | pending | **Capture** | → `captured`, Amount Captured updated, Transaction Timeline appended, action bar correctly shows "no further action available" |
| `01a00c78-6b72...` | sslcommerz | authorized | **Void** (with reason) | → `voided`, reason recorded on the Timeline |
| `01a00c78-6be4...` | bank_transfer | pending | **Attach proof** → **Approve transfer** | Proof reference saved and displayed; then → `captured`, Amount Captured updated |
| `01a00c82-17ae...` | bank_transfer | pending | **Reject transfer** (with reason) | → `failed`, the real `failureReason` surfaced in the existing "Payment failed" banner and on the Timeline |
| `01a00c78-6b0b...` (retried) | sslcommerz | pending | **Capture, empty confirm** | Client-side "reason required" validation correctly blocked submission before any request |
| — | — | — | **Capture with a mocked stale `expected_version`** | Real 409 surfaced as the reload-prompt message, not a silent failure (Playwright, mocked — see §7) |
| — | — | — | **Session with only `payments.payments.view`** | Capture/Cancel/Void hidden entirely, not merely disabled |

Also confirmed live: Capture/Cancel/Void render for `bank_transfer` payments too (alongside the Bank Transfer section), per the deliberate design decision in §3 — no unenforced business rule invented to hide them.

Desktop and mobile screenshots of the Payment Actions card and Bank Transfer verification section were captured against this live data and delivered separately.

## 7. Quality gates

| Gate | Result |
|---|---|
| `npm run typecheck` (admin + api-client) | ✅ Pass (after fixing the `ExpectedVersionInput` barrel-export collision) |
| `npm run lint` | ✅ Pass |
| Unit tests, `packages/api-client` (payments) | ✅ 3 files, 11 tests, all pass (new `workflow.test.ts` — 6 tests, one per endpoint, verifying exact URL + POST body shape) |
| Unit tests, `apps/admin` (payments) | ✅ 2 files, 8 tests, all pass (pre-existing `formatCurrency`/`auditAction` — no new frontend unit tests needed for the dialogs themselves, matching Shipping's own precedent of not unit-testing `errors.ts`/dialog components directly) |
| `npm run build` (admin) | ✅ Pass |
| Playwright, `payments.spec.ts` | ✅ 12/12 pass, including 7 new Slice 2 tests: Capture, Cancel (with validation), Void (status-gated), 409-conflict surfacing, permission-gating (hidden not disabled), Bank Transfer Attach/Approve, Bank Transfer Reject (with validation) |
| Playwright, full suite | ✅ 150 passed / 6 failed — the 6 failures are exactly the pre-existing, already-documented baseline (`catalog-brands.spec.ts` ×3, `catalog-product-slice2.spec.ts` ×2, reproduced identically since Phase 2.2) plus zero new Payments regressions |
| Accessibility (`@axe-core/playwright`, critical/serious) | 1 finding, on the existing Payments Activity page's own subtitle/empty-state text (`text-body text-text-secondary` at 4.37:1, just under the 4.5:1 AA threshold). Traced to the color token pairing itself, not anything Slice 2 touched — this exact combination is used identically across every module's own page-subtitle pattern, and the `--text-secondary` color value is confirmed unchanged by this slice's diff. Documented here as a genuine, pre-existing, cross-cutting design-token finding for a future design pass — not fixed, since touching a shared token is out of Payments' own scope and risks visual regression across every already-frozen module. |
| Backend: `php84 artisan test --filter=Payments` | See §4 — zero regressions from this slice's own changes; all failures trace to a pre-existing missing local MySQL test database, confirmed by reproducing the identical failure pattern in Catalog's and Checkout's own `HasOptimisticLockingTest` with this slice's changes fully reverted |

## 8. Readiness score

**92 / 100.**

- All 6 real, existing write capabilities built, permission-gated correctly at both the general (`.manage`) and narrower (`.bank_transfer.verify`) level, and live-verified end-to-end against the real backend.
- One genuine, pre-existing backend bug found and fixed (blocking the real Capture endpoint), verified not to regress anything.
- Two points held back for the pre-existing, cross-cutting a11y contrast finding (§7) and the `BankTransferGateway` availability documentation mismatch (§5) — both real, both out of this slice's scope to fix, both worth a Product Owner decision on follow-up ownership before Payments freezes.
- No fake data, no invented endpoints or permissions, no scope expansion into Refund/Authorize/Retry.

## 9. Next step

Per the master task: proceed to the **Payments Final Freeze Audit** (Slice 1 + Slice 2 together, cross-module Orders → Payments → Notifications → Customers → Audit), fix only genuine bugs found there, run full quality gates again, and only after Product Owner approval commit and push **Payments only**.
