# Milestone 12 — Merchant Onboarding & Production Readiness Indicators — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`, verified against the actual repository per the standing instruction: classify the real implementation state first, correct the roadmap to match the repository, then continue — never force the code to match a stale document.

## Part 0 — Verification Against the Repository (Before Any Implementation)

The plan's own objective read: "A real onboarding checklist, a production-readiness indicator, and honest configuration warnings... surfaced directly in the Admin Dashboard — largely assembled from evidence this audit itself already gathered."

Direct verification found:

1. **A different, pre-existing "health check" system already exists** (`Platform\Foundation\Health`) — `HealthCheckService`/`HealthCheck` contract, three real checks (Database, Cache, Queue), exposed at `GET /api/health`. **Fully implemented, but a different concept entirely**: an unauthenticated SRE/uptime-monitor surface answering "are this instance's infrastructure dependencies reachable," never merchant-configuration-facing (correctly so — it must never leak "no payment gateway configured" to an anonymous caller). Not reused or extended for this milestone; a genuinely separate concern.
2. **No merchant-facing configuration-health or onboarding checklist existed anywhere** — confirmed by grep across both `apps/admin` and `apps/backend`. **Absent**, matching the plan.
3. **The real per-module signals this milestone needs already existed as real, tested capabilities, just not exposed for this purpose**: Payments' `GatewayResolver`/`GatewayRegistry` (its own docblock already named "for `PaymentMethodController` to report as configured-but-incomplete" as a future use — this milestone realizes it), Shipping's `Couriers\ProviderResolver::allProviders()` already exposed via `GET shipping/providers`, and `GET shipping-zones` for real zone counts. **Notifications had no equivalent provider-listing endpoint at all** — a real, narrow gap, fixed by mirroring Shipping's own proven three-file pattern exactly.

No plan-vs-repository discrepancy required correction — the objective was accurate; only the "how" (reuse existing resolver/registry infrastructure, add one small missing piece for Notifications) needed direct verification before building.

## Part 1 — What Shipped

### Backend
- **Payments**: `GatewayResolver::allGateways()` (mirrors Shipping/Notifications' own `allProviders()` exactly) — every registered gateway, not only available ones. `PaymentMethodController::index()` now accepts `?all=1`, defaulting to its pre-existing available-only behavior unchanged (the real Storefront checkout screen that already calls this route is unaffected). `PaymentMethodResource` gained a real `available` field.
- **Notifications**: a new `notifications.providers.view` permission, `NotificationProviderResource`/`NotificationProviderController` (mirroring `ShippingProviderResource`/`ShippingProviderController` field-for-field), and `GET /notification-providers` — a distinct path segment (not nested under `notifications/`) for the identical routing-collision reason `notification-audit-logs` already is.
- **Shipping/Catalog**: no backend changes needed — `GET shipping/providers`, `GET shipping-zones`, and `GET products?status=active` already existed and already carried everything this milestone needs.
- 5 new/updated tests, all passing. Full backend suite: **1271/1274** (the same 6 pre-existing, unrelated OpenSSL-environment failures as Milestone 11, confirmed untouched).

### `packages/api-client`
- `payments.ts`: `listPaymentMethods(client, { all: true })`.
- `shipping/providers.ts` (new): `listShippingProviders`.
- `notifications/providers.ts` (new): `listNotificationProviders`.
- New/updated types: `PaymentMethodDTO.available`, `ShippingProviderDTO`, `NotificationProviderDTO`.
- New tests for the `{ all: true }` option. Full suite: **208/208**.

### Admin (`apps/admin`)
- **`ProductionReadinessWidget`** — a new, cross-cutting Dashboard widget (the one widget this milestone needs with no single owning business module, so it is registered by the Dashboard module itself, first in registration order, rendering at the top of the grid). Five real, live rows:
  1. Online payment gateway configured (excludes Cash On Delivery/Bank Transfer, which need no credentials at all and would otherwise make this check trivially, permanently true).
  2. Shipping zone count (links to `/shipping/zones` when zero).
  3. Real courier integration configured (excludes the always-available `manual` courier for the identical reason as #1).
  4. Email notification provider configured.
  5. Active product count (links to `/catalog/products` when zero).
- Each row degrades independently to an honest "couldn't check — you may not have permission" state if its own underlying query fails, rather than an all-or-nothing gate — deliberate, since this widget spans permissions from four different modules and the existing `dashboardWidgets` registry's OR-semantics `permissions` filter doesn't fit a "needs all of these" shape.
- Payment gateways and notification providers are `.env`-configured with no Admin UI to set them at all (confirmed by reading their own `isAvailable()` implementations) — those two rows honestly name what's missing without a fabricated "Configure →" link to a screen that doesn't exist.

## Part 2 — Verification

| Check | Result |
|---|---|
| Backend PHPStan | Clean |
| Backend Pint | Clean |
| Backend full suite | **1271/1274** (6 pre-existing, unrelated OpenSSL-env failures) |
| `api-client` typecheck | Clean |
| `api-client` full suite | **208/208** |
| Admin typecheck/lint | Clean |
| Admin full suite | **156/156** |

### Live, end-to-end verification (real backend + real Admin, real browser)
Logged in as a temporary, purpose-created test administrator (the platform's own real admin account's password is not known/stored, per SECURITY:SECURE_CONFIGURATION — never guessed or reset) and confirmed the widget renders first on the real Dashboard with real, accurate data matching this environment's actual configuration: "No online payment gateway configured," "1 shipping zone configured," "No real courier integration configured," "No email notification provider configured," "1 active product in your catalog" — every line traceable to real, verified `.env`/database state, not fabricated. No console errors. Cleaned up the temporary test administrator afterward.

## Part 3 — Final Classification

**Production ready.** Every signal is real, live, and independently fault-tolerant; nothing is a static, one-time-computed checklist that would go stale the moment a merchant fixes a gap — reloading the Dashboard always reflects the current, real state.

## Part 4 — Roadmap Correction

`PRODUCTION_COMPLETION_PLAN_v2.md`'s Milestone 12 entry is marked ✅ Shipped. This is the final milestone in the plan's own Part 3 — no further milestones remain scheduled in this document as of this session.

---
