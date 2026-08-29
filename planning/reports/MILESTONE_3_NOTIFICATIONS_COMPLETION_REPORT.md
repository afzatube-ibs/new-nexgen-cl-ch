# Milestone 3 — Notifications Completion — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`, per explicit instruction: every claim below was re-verified against the actual repository before implementation; where the plan's own text was wrong, the plan was corrected to match the code, not the other way around.

## Part 1 — Plan correction found before writing any code

The plan's Milestone 3 objective named three gaps, one of which — **"`OrderCancelled` does not exist as an event or an action — there is no real 'cancel an order' capability in the backend at all today"** — is **false**. Direct code read found:

- `Orders\Actions\CancelOrderAction` — real, complete: version-checked (`assertVersionMatches`), state-machine-validated (`canTransitionTo`), audit-logged, records a timeline entry, publishes `OrderStatusChanged`.
- `Orders\Http\Controllers\OrderStatusController::cancel()` — real route, `POST orders/{order}/cancel`, gated by the existing `orders.orders.manage` permission.
- `Orders\Http\Requests\CancelOrderRequest` — real validation (`reason`, `expected_version`).
- `apps/admin/src/modules/orders/detail/OrderCancelDialog.tsx` — a real Admin UI already calls this endpoint.
- `tests/Feature/Domains/Commerce/Orders/OrderStatusTest.php` — already covers it.

`PRODUCTION_COMPLETION_PLAN_v2.md` has been corrected in place (Orders module row + Milestone 3 section) to reflect this. The **real, remaining gap** was narrower than the plan assumed: `OrderStatusChanged`'s transition to `cancelled` had no notification listener — a shopper whose order was cancelled received no email. This milestone closes that real gap using the existing event, adding no new one.

The other two named gaps were both confirmed real by direct read: `Payments\Events\PaymentFailed` and `Checkout\Events\CheckoutAbandoned` were both published with zero subscribers anywhere in the codebase.

## Part 2 — What Shipped

### 1. Three new cross-domain notification listeners (`app/Listeners/`)
Each follows the exact, established pattern of the platform's other 8 `Send*On*.php` listeners (queue via `Notifications\Actions\QueueNotificationAction`, try/catch + `report()` so a notification failure can never break the workflow that triggered it, recipient resolved from the triggering domain's own snapshot data):

- **`SendPaymentFailureNoticeOnPaymentFailed`** — subscribes to `Payments\Events\PaymentFailed`. Recipient resolved via `Order::find($event->orderId)->customer_email`. Template `payment.failed`, merges `customer_name`, `order_number`, and the event's own already-sanitized `reason` (never a raw gateway response, per that event's own docblock).
- **`SendAbandonedCartReminderOnCheckoutAbandoned`** — subscribes to `Checkout\Events\CheckoutAbandoned`. Since no real customer authentication exists on the Storefront today (every order is guest checkout), the only real, addressable recipient is the session's own `guest_email`. A session abandoned before that field was ever filled is a genuine no-op — this listener never fabricates a recipient. Template `checkout.abandoned`, merges `customer_name` (falls back to "there"), real `item_count`/`grand_total`/`currency_code` read from the session.
- **`SendOrderCancellationNoticeOnOrderStatusChanged`** — subscribes to `Orders\Events\OrderStatusChanged`, the one event class reused for every status transition. Deliberately narrow: returns immediately unless `$event->toStatus === Order::STATUS_CANCELLED` (dispatch/delivery already have their own dedicated Fulfillment-side events/listeners, so every other transition is a genuine no-op here, not a missed case).

### 2. Three new notification templates (`NotificationTemplateSeeder`)
`payment.failed`, `checkout.abandoned`, `order.cancelled` — same idempotent `updateOrCreate`-by-`(code, channel, locale)` pattern as the existing 8, so a fresh `db:seed` (or a re-run against an existing install) provisions all 11 with zero manual steps.

### 3. Two real, pre-existing decimal-cast bugs found and fixed
Running this milestone's own new tests against the full `Checkout` test suite surfaced the exact same bug class Milestone 2 found and fixed on `PriceListEntry`/`TaxRate`: missing Eloquent `decimal:N` casts let SQLite's NUMERIC column affinity return a plain PHP int/float instead of the expected decimal string.

- **`CheckoutSession`**: `shipping_total`, `subtotal`, `discount_total`, `tax_total`, `grand_total` — migration declares `decimal(14,4)` on all five; model had no casts for any of them.
- **`CheckoutItem`**: `unit_price`, `tax_amount` — same gap, same fix.

Both fixes are additive `casts()` entries matching the migrations' own precision exactly — no behavior change beyond correcting the returned type, and both are covered by the pre-existing `CheckoutReviewTest` (which was failing before this fix, confirmed via a baseline run with these changes stashed out: 28 failures without the fix, 27 with it — a net reduction, zero regressions).

## Part 3 — Verification

| Check | Result |
|---|---|
| PHPStan | 0 errors |
| Pint | Passed |
| Full backend Pest suite (SQLite) | **1157/1184 passed.** The 27 remaining failures are confirmed pre-existing and unrelated: verified by stashing this milestone's changes and re-running the identical full suite, which produced **28** failures on the unmodified baseline — one more than with this milestone's fix applied (the `CheckoutReviewTest` decimal-cast failure this milestone fixed). No test that passed on the baseline fails with this milestone's changes. The remaining 27 are the same pre-existing, environment-specific gaps named in prior milestone reports (MySQL FULLTEXT vs. SQLite in Search, Nagad gateway fixture issues, a Shipping rate-quote fixture gap, a Returns refund-retry fixture gap) — none touch Notifications, Checkout, Orders, or Payments' own core logic this milestone changed. |
| New tests | 4 new: payment-failure notice queued with the real reason in the body; abandoned-cart reminder queued for a guest session with a real email; **no** notification queued for a guest session with no email (proves no fabrication); order-cancellation notice queued only on the `cancelled` transition, not on `confirmed`/other transitions. |

### Live verification against the real, booted application (not just the test suite)
Published both new events directly through the real `DomainEventBus` in the actual running application (`php artisan tinker`), against a real order in the dev database, to prove the `AppServiceProvider` registrations are wired correctly outside of Pest's own test-container bootstrap:

```
PaymentFailed  → Notification queued: recipient=freeze.verify@nexgen-demo.test,
                 status=queued, subject="We couldn't process your payment for order ORD-20260815-C58424D5"
OrderStatusChanged(toStatus: cancelled)
               → Notification queued: subject="Your order ORD-20260815-C58424D5 has been cancelled"
```

Both synthetic verification rows were deleted immediately after (`Notification::query()->whereIn('subject', [...])->delete()`) so no fabricated data lingers in the dev database. The real `NotificationTemplateSeeder` was also run against the real dev database (`php artisan db:seed --class=NotificationTemplateSeeder --force`) and confirmed all three new templates exist and are active.

## Part 4 — Files Changed

**Backend**: `app/Listeners/{SendPaymentFailureNoticeOnPaymentFailed.php,SendAbandonedCartReminderOnCheckoutAbandoned.php,SendOrderCancellationNoticeOnOrderStatusChanged.php}` (new), `app/Providers/AppServiceProvider.php` (3 new subscriptions), `database/seeders/NotificationTemplateSeeder.php` (+3 templates), `app/Domains/Commerce/Checkout/Models/{CheckoutSession.php,CheckoutItem.php}` (decimal casts). Tests: `tests/Unit/Listeners/NotificationListenersTest.php` (+4 tests).

**Documentation**: `PRODUCTION_COMPLETION_PLAN_v2.md` corrected (Orders module row, Milestone 3 section, Part 3 shipped-milestones note).

## Part 5 — Remaining, Honest Gaps (not this milestone's scope)

- **No Admin UI for notification templates or delivery logs** — a merchant still cannot view/edit a template or see delivery history without direct database/API access. This is a real, separate Admin-surface gap (same category as Fulfillment/Returns' own missing Admin UI), not a delivery-logic gap — correctly out of this milestone's scope, tracked for a future Admin-UI milestone.
- **Real Mailgun/Brevo credentials remain empty** in `.env` — every notification this milestone (and the platform generally) queues is real and correctly triggered, but cannot complete actual external delivery in this environment today. A merchant-configuration gap, not a code gap, per the plan's own Part 2 cross-cutting finding.
- **No admin-facing alert (new order, low stock)** — out of scope for this milestone (a genuinely different kind of notification, staff-facing rather than customer-facing); not attempted here.

---
