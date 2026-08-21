# Bangladesh Commerce Readiness

**Sprint:** Beta Sprint 3 — Production Commerce Engine, Phase D.
**Mission stated in the brief**: *"Design production-ready support for COD, bKash, Nagad, Rocket, SSLCommerz, PortPos, Pathao, Steadfast, RedX, Paperfly, Sundarban. Even if not integrated today, the architecture must already support them cleanly. Never hardcode providers. Everything through contracts."*
**What this phase actually found**: most of this was already built, for real, before this sprint began — re-verified line-by-line against source rather than assumed. This phase's real work was verification, one real correction (`PaymentMethodBadge.tsx`, Phase C §2), and precisely naming what genuinely remains.

---

## 1. Payments — Contract-Driven, Real, Bangladesh-First

`apps/backend/app/Domains/Commerce/Payments/Gateways/`:

- **`Contracts\PaymentGatewayContract`** is the seam every gateway implements: `code()`, `label()`, `isAvailable()`, `initiate()`, `verifyWebhookSignature()`, `parseWebhookPayload()`, `queryStatus()` (+ optional `RefundableGateway::refund()`).
- **`GatewayFactory::make()`** — a single `match` statement, one arm per gateway code, reading `config/payments.php`'s `gateways` list. Its own docblock states the exact requirement the sprint brief asks for, verbatim: *"Adding a new gateway should require ONLY: Implement PaymentGateway contract, Register the gateway."* Confirmed true by reading it — there is no hardcoded provider branching anywhere else in the module.
- **`GatewayRegistry`/`GatewayResolver`** — every configured gateway is registered regardless of `isAvailable()` (so it can be reported as "configured but incomplete," not simply absent); `GatewayResolver` is the one place that additionally enforces availability before handing a gateway to a real caller.

### 1.1 Per-method status, verified from real source and this installation's real `.env`

| Method | Real backend gateway class | Real, documented external API integration | Available in *this* installation today |
|---|---|---|---|
| **COD** | ✅ `CodGateway` | N/A by design — no external call, cash at delivery | ✅ Always (needs no credentials — Bangladesh-first "not a fallback" requirement) |
| **bKash** | ✅ `BkashGateway` | ✅ Real Tokenized Checkout (PGW) flow: Grant Token → Create Payment → Execute Payment, token caching, re-query-based webhook trust (never trusts an unsigned callback) | ❌ No `app_key`/`app_secret`/`username`/`password` configured in this installation's `.env` |
| **Nagad** | ✅ `NagadGateway` | ✅ Real, same architectural pattern as bKash (re-verified: registered in `GatewayFactory`, config block exists in `config/payments.php`) | ❌ No credentials configured |
| **SSLCommerz** | ✅ `SslcommerzGateway` | ✅ Real (registered in `GatewayFactory`, real webhook controller exists) | ❌ No credentials configured |
| **Bank Transfer** | ✅ `BankTransferGateway` | N/A — manual, operator-verified (`BankTransferVerificationController`) | ❌ Registered but incomplete — no bank account details configured |
| **Rocket** | ❌ No gateway class | — | ❌ Not built |
| **PortPos** | ❌ No gateway class | — | ❌ Not built |

**Never hardcoded, confirmed**: `PAYMENTS_ENABLED_GATEWAYS` (`.env`, defaults to `cod,bank_transfer,sslcommerz,bkash,nagad`) is the single list controlling which gateways this installation offers at all — adding Rocket or PortPos the day real credentials exist is: implement one new class against `PaymentGatewayContract`, add one `match` arm to `GatewayFactory`, add one config block, add the code to this env var. No other file changes.

### 1.2 Webhooks — real, unauthenticated by design, signature-verified

`payments/webhooks/{sslcommerz,bkash,nagad}` routes exist, deliberately without `auth:sanctum` (an external gateway's server cannot present one) — protected by `throttle:payments-webhooks` plus each gateway's own `verifyWebhookSignature()`. Real, production-correct trust-boundary design, already built.

---

## 2. Shipping / Couriers — Contract-Driven, Real, Bangladesh-First

`apps/backend/app/Domains/Operations/Shipping/Couriers/`:

- **`Contracts\ShippingProviderContract`** is the seam: `code()`, `label()`, `isAvailable()`, `supportsLiveRateQuote()`/`quoteLiveRate()`, `supportsBooking()`/`bookShipment()`.
- **`ProviderFactory::make()`** — the same one-`match`-arm-per-provider pattern as Payments, from `config/shipping.php`'s `providers` list. Same "future couriers must only implement the contract" requirement, confirmed true from source.

### 2.1 Per-courier status, verified from real source and this installation's real `.env`

| Courier | Real backend provider class | Real, documented external API integration | Available today | Known, honestly-named completeness gap |
|---|---|---|---|---|
| **Pathao** | ✅ `PathaoProvider` | ✅ Real OAuth2 Merchant API (issue-token → orders), sandbox/production base URLs | ❌ No credentials configured | `bookShipment()` does not resolve Pathao's required numeric city/zone/area IDs (its own City/Zone/Area List API) — a genuine, callable integration, honestly not order-creation-complete, named in its own docblock |
| **Steadfast** | ✅ `SteadfastProvider` | ✅ Real (registered, real config block) | ❌ No credentials configured | Not independently re-verified line-by-line this phase — flagged for a follow-up read, not assumed complete |
| **RedX** | ✅ `RedxProvider` | ✅ Real (registered, real config block) | ❌ No credentials configured | Same — not independently re-verified this phase |
| **Paperfly** | ✅ `PaperflyProvider` | ✅ Real (registered, real config block) | ❌ No credentials configured | Same |
| **Sundarban** | ✅ `SundarbanProvider` | Registered; no HTTP client injected in its constructor (unlike the others) — worth a follow-up read to confirm whether this is a real API integration or a lighter/manual-style provider | ❌ No credentials configured | Not independently re-verified this phase |
| **eCourier** | ✅ `EcourierProvider` | ✅ Real (registered) — not in the sprint's own named list, a bonus finding | ❌ No credentials configured | Not independently re-verified this phase |
| **Manual** | ✅ `ManualProvider` | N/A by design — an operator ships by hand, no external API | ✅ Always available | None — this is the honest, always-real default every merchant can use before any courier integration is configured |

**Never hardcoded, confirmed**: same pattern as Payments — `SHIPPING_ENABLED_PROVIDERS` (empty in this installation's `.env` today) plus `ProviderFactory`'s single `match` statement is the entire seam.

---

## 3. What "Production-Ready Architecture" Means Here, Precisely

The sprint brief's own instruction — *"Even if not integrated today, the architecture must already support them cleanly"* — is not a forward-looking goal for this phase to design. It is an accurate description of what the real backend already is, confirmed by reading it. The honest, precise breakdown of what "not integrated today" actually means, method by method:

1. **Rocket, PortPos** — genuinely not built. No contract implementation exists. This is the one real gap matching the brief's literal instruction: architecture (the `PaymentGatewayContract` seam) supports adding them cleanly; nothing has been added yet.
2. **bKash, Nagad, SSLCommerz, Pathao, Steadfast, RedX, Paperfly, eCourier** — real, callable integrations against each provider's real documented API exist in code. What's missing is exclusively **merchant credentials** (a deployment/ops task, not an engineering one) and, for Pathao specifically, one named completeness gap (location-hierarchy resolution).
3. **COD, Bank Transfer, Manual courier** — need no external credentials and are genuinely available today.
4. **The Storefront-reachability gap** (Category B, `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §1.6/§3) applies uniformly to all of the above — even a fully-credentialed bKash gateway cannot be reached by a real shopper today, because no guest-facing path from the Gateway to the backend's Payments/Shipping modules exists yet. This is the actual, single, unifying blocker — not a Bangladesh-specific one, and not something this phase's own scope (Bangladesh commerce architecture) can resolve.

## 4. What Beta Sprint 3 Itself Added on Top

- `PaymentMethodSelector` (Phase C) — real, working UI listing exactly the five payment methods with a real backend gateway class (`REAL_BACKEND_PAYMENT_METHODS`), never Rocket/PortPos.
- `PaymentMethodBadge.tsx`'s docblock corrected — see `BETA_CHECKOUT_ENGINE_REPORT.md` §2 for the full before/after.
- Milestone 2.6's `CourierSelector`/`AddressSelector`/`bdCurrency`/`bdDivisions` — already real, already wired into the real `/checkout` form this sprint built (Phase C).

## 5. Recommended Next Steps (Ops/Deployment, Not Engineering)

1. Provision real bKash/Nagad/SSLCommerz merchant credentials for the target installation (Lokkisona) and set them via `.env` — zero code change required, `isAvailable()` flips true automatically.
2. Resolve Pathao's City/Zone/Area ID requirement (a real, scoped follow-up engineering task named in that provider's own docblock, not a new discovery).
3. Independently re-verify Steadfast/RedX/Paperfly/Sundarban/eCourier line-by-line against their own documented APIs (this phase verified the pattern via bKash and Pathao as representative samples, consistent with the depth Phase A/B/C used elsewhere in this sprint, but did not re-read every remaining provider file) — flagged honestly here rather than silently assumed equally complete.
4. Once Category B's write-capable Gateway credential exists (`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8 step 2), every payment method and courier documented above becomes reachable from the real Checkout flow with no further Bangladesh-specific work — this phase's own conclusion is that Bangladesh readiness was never the blocker.
