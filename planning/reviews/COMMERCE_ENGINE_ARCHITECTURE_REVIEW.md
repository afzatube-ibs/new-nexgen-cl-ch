# Commerce Engine Architecture Review

**Sprint:** Beta Sprint 3 — Production Commerce Engine (Cart → Checkout → Order), Phase A.
**Method:** Every claim below is sourced directly from re-reading real backend PHP source (`apps/backend/app/Domains/Commerce/{Checkout,Payments,Orders,Customers,Promotions}`, `apps/backend/app/Domains/Operations/Shipping`), real Gateway source (`apps/store-api-gateway/src`), and the platform's own Accepted architecture documents (`docs/frontend/STORE_FRONTEND_ARCHITECTURE.md`, `docs/frontend/STORE_API_GATEWAY_ARCHITECTURE.md`, `docs/MASTER_PRODUCT_ROADMAP.md`, `docs/frontend/CUSTOMER_EXPERIENCE_ARCHITECTURE.md`, `docs/frontend/PERFORMANCE_FOUNDATION.md`) — not from memory of prior milestones. Where a prior document already answered a question definitively, it is cited, not re-derived.

---

## 0. The Single Fact That Shapes This Entire Sprint

**The real backend's Commerce Engine — Checkout, Payments, Shipping, Customers, Orders — is architecturally mature, production-shaped, and real.** It is not a gap. What is genuinely missing is one specific, already-named thing: **a customer-facing (guest/registered-shopper) authentication guard on the backend.** Every write-capable route across Checkout, Payments, Shipping, and Customers requires Laravel Sanctum staff authentication (`auth:sanctum` + a specific `permission:` grant) — confirmed directly in every one of those modules' own `routes.php`, and independently confirmed by three separate docblocks stating the same thing in each module's own `Authorization\PermissionRegistry`: *"no customer-facing authentication guard exists yet on this platform."*

This is not a discovery this sprint is making for the first time. `docs/frontend/STORE_FRONTEND_ARCHITECTURE.md` §3.3 already names it as **"this document's single most important scheduling fact"**: *"A real Storefront **cannot** ship real cart/checkout/account until Category B's customer guard exists on the backend."* `docs/MASTER_PRODUCT_ROADMAP.md` already tracks Checkout/Payments/Shipping under a not-yet-green Gate. This sprint's job is to act on that fact precisely, not rediscover it — and, per its own instruction, to document if the roadmap should change now that the moment has arrived.

Everything below explains what this means concretely for Cart, Checkout, Payments, Bangladesh Commerce, and Order Success.

---

## 1. Current Capabilities (Re-Verified Against Source, Not Assumed)

### 1.1 Checkout (`apps/backend/app/Domains/Commerce/Checkout`)

A real, complete, production-grade `CheckoutSession` aggregate:
- **State machine**: `open ↔ reviewed → submitting → submitted`, plus terminal `expired` — enforced in the model itself (`assertMutable()`, `resetReviewIfNeeded()`), not left to callers to get right.
- **Guest-native**: `customer_id` is nullable; `guest_email`/`guest_name` carry a guest shopper. `StartCheckoutAction` treats guest and registered checkout as *the same action*, distinguished only by whether `customer_id` is present — guest checkout was never an afterthought here.
- **Optimistic locking** (`lock_version` + `expected_version` on every mutation) and a **60-minute rolling expiry** (`CheckoutSession::LIFETIME_MINUTES`, extended by `touchExpiry()` on every real mutation, swept by `Console\Commands\ExpireCheckoutSessionsCommand`).
- **Idempotent submission**: `SubmitCheckoutAction` is a documented saga — row-lock claim → reserve stock (Inventory) → resolve/register customer → redeem promotions → create Order (Orders) → finalize — with explicit compensation (stock reservations released, session reverted to `reviewed`) on any step's failure, and a genuine idempotency guarantee (retrying a fully-submitted session returns the existing Order, never double-submits).
- **Real pricing/tax/discount composition at review time**: `ReviewCheckoutAction` calls Pricing's `LookupPriceAction`/`CalculateTaxAction` and Promotions' `EvaluatePromotionsAction` live, per line item, using `bcmath` for exact decimal arithmetic — never a client-supplied total.
- **Abandoned-checkout recovery**: `RecoverCheckoutSessionAction` and a `CheckoutAbandoned` domain event already exist.
- **Full audit trail**: every mutating action writes to Checkout's own append-only `AuditLog`.

**Gap found live**: `Checkout\Support\ShippingOptionCatalog` is a hardcoded, in-memory, 3-option flat-rate list (`standard`/`express`/`overnight`, USD-shaped amounts), with its own docblock candidly stating it exists *because "there is no Shipping & Logistics module yet to integrate with."* **That statement is now stale.** A real `Operations\Shipping` module (§1.3 below) exists with real Zones/Rates/Couriers and was clearly built after Checkout's own shipping-option code — the two were never wired together. This is a real, concrete integration gap, not a missing capability.

### 1.2 Payments (`apps/backend/app/Domains/Commerce/Payments`)

A real, contract-driven, multi-gateway payment engine — this is, functionally, most of what Sprint 3's Phase D asks for, already built:
- `Gateways\Contracts\PaymentGatewayContract` (+ `RefundableGateway`) is the seam every gateway implements: `code()`, `label()`, `isAvailable()`, `initiate()`, `verifyWebhookSignature()`, `parseWebhookPayload()`, `queryStatus()`.
- Five real gateway implementations exist today: `CodGateway`, `BkashGateway`, `NagadGateway`, `SslcommerzGateway`, `BankTransferGateway` — registered via `GatewayFactory`/`GatewayRegistry` from `config/payments.php`'s own `gateways` list, resolved through `GatewayResolver`. Adding a new gateway (Rocket, PortPos) is implementing one new class against the existing contract and adding one config entry — **never a hardcoded provider list**, which is exactly what Sprint 3 Phase D asks the architecture to guarantee. It already does.
- `CodGateway` is explicitly documented as *"a first-class Bangladesh gateway, not a fallback"* — no external call, `initiate()` returns `pending` with human instructions, captured on delivery confirmation via the same `CapturePaymentAction` every gateway uses.
- Real webhook receivers for bKash/Nagad/SSLCommerz, deliberately **without** `auth:sanctum` (an external gateway cannot present one) — protected instead by `throttle:payments-webhooks` plus each gateway's own `verifyWebhookSignature()`, matching this platform's own documented external-integration trust-boundary pattern.
- Full `Payment`/`PaymentAttempt`/`PaymentWebhookEvent` models, `AuthorizePaymentAction`/`CapturePaymentAction`/`RefundPaymentAction`/`VoidPaymentAction`/`CancelPaymentAction`, reconciliation (`ReconcilePaymentsAction` + a scheduled `ReconcilePaymentsCommand`), and a full audit trail.

**Gap found live**: `SubmitCheckoutAction` creates an `Order` and stops — it never calls `InitiatePaymentAction`. Checkout submission and payment initiation are two real, independent capabilities that are not yet orchestrated together. Something (Gateway or a new backend orchestration step) has to call `POST /payments` immediately after a successful checkout submission; nothing does today.

**Not present**: no `RocketGateway`, no `PortPosGateway`. The contract trivially supports adding them; neither exists yet.

### 1.3 Shipping (`apps/backend/app/Domains/Operations/Shipping`)

Also real, also contract-driven, also more mature than Checkout's own `ShippingOptionCatalog` assumes:
- Real `ShippingZone`/`ShippingMethod`/`ShippingRate` CRUD (zone-based rate tables, exactly the shape a real merchant needs).
- `Couriers\Contracts\ShippingProviderContract`, with real implementations: `PathaoProvider`, `SteadfastProvider`, `RedxProvider`, `PaperflyProvider`, `SundarbanProvider`, `EcourierProvider`, `ManualProvider` — resolved via `ProviderFactory`/`ProviderRegistry`/`ProviderResolver`, the same contract-first pattern as Payments. This is the real backend home for every Bangladesh courier Sprint 3 Phase D names except one: **`ManualProvider`** already covers the "no courier integration configured yet, an operator ships by hand" honest-default case.
- A real `CalculateShippingRateAction` and a `POST shipping/quote` endpoint (`ShippingRateQuoteController`) — genuinely callable to get a real rate, not a placeholder.

**Gap found live** (same as §1.1): Checkout does not call this module. Two real, independent shipping-rate capabilities exist in this codebase today and have never been connected.

### 1.4 Orders (`apps/backend/app/Domains/Commerce/Orders`)

`CreateOrderAction` is real and disciplined: it *sums* figures Checkout already computed (via `bcmath`), it never recalculates a price or a discount itself — a clean, auditable separation of concerns. Produces a real `Order` with snapshotted customer/address data (never a live reference), line items, discounts, and a `timelineEvents` history seeded with `order.placed`. `order_number` generation is real (confirmed via the audit log payload). No payment is attached at creation (§1.2's gap).

### 1.5 Customers (`apps/backend/app/Domains/Commerce/Customers`)

Real `Customer`/`CustomerAddress` models with default-billing/default-shipping flags (read by `StartCheckoutAction` to prefill a registered customer's checkout). `RegisterCustomerAction` is a real, public (module-internal) action — used both by staff creating a customer record and, critically, by `SubmitCheckoutAction`'s own guest-resolution step, which finds-or-creates a `Customer` row for a guest email with a random, never-communicated password. **Every route in this module is staff-`auth:sanctum`-gated** — there is no route a shopper could call to register or log themselves in. This is the same Category-B gap as Checkout, not a separate one.

### 1.6 The Gateway (`apps/store-api-gateway`)

Confirmed directly from `src/backend/client.ts`: the Gateway's only credential today is a **"scoped Storefront Service Sanctum token (view-only permissions)"** — its own docblock's words — and `BackendClient` implements exactly two methods, `getList`/`getItem`, both HTTP `GET`. **There is no write path from the Gateway to the backend today, at either the credential-permission layer or the HTTP-client-code layer.** This is the concrete, load-bearing fact underneath the "Category B" gap named throughout the architecture docs — it is not abstract; it is a specific, small, real client class with no `post`/`patch`/`delete` method yet, and a token that could not use one if it existed.

### 1.7 Storefront (`apps/storefront`)

Confirmed against `docs/frontend/STORE_FRONTEND_ARCHITECTURE.md`/`CUSTOMER_EXPERIENCE_ARCHITECTURE.md` and this engagement's own prior milestones: Catalog browsing (Home/Category/Brand/Collection/Search/Product Detail) is real, complete, and already accepted as production-quality UI (Beta Milestones 1–2.6). **Zero cart or checkout code exists yet** — every "Add to cart" button across every page built so far is a real, honestly-inert placeholder (`aria-label="... — coming soon"`), by explicit design across every milestone.

---

## 2. Missing Capabilities

Ranked by what actually blocks a real order, not by build effort:

1. **A customer-facing authentication guard on the backend** (Category B, named since `STORE_FRONTEND_ARCHITECTURE.md` §3.3). This blocks: any backend-persisted cart/checkout for an *authenticated* customer, customer login/register/order-history, and — see §3 below — the specific mechanism by which even a *guest* checkout gets called at all.
2. **A write-capable Gateway → backend credential and client.** Even guest checkout (which the backend model already fully supports) cannot be called by the Gateway today: the Gateway's only credential is view-only, and its HTTP client has no write verb. This is a smaller, more tractable gap than #1 — see §7.
3. **Checkout ↔ Shipping composition.** Two real modules, never connected.
4. **Checkout submission ↔ Payment initiation composition.** Two real modules, never connected.
5. **A Storefront Cart UI.** Genuinely buildable today, zero backend dependency — see §7 and `BETA_CART_ENGINE_REPORT.md`.
6. **A Storefront Checkout UI wired to a real `CheckoutSession`.** Blocked on #2 at minimum for guest checkout, on #1 for authenticated-customer checkout.
7. **`RocketGateway`/`PortPosGateway`** — not built; trivial to add to the existing contract once a merchant has real credentials for either.
8. **Order Success / tracking / invoice surfaces on the Storefront.** No backend blocker of the same kind — mostly a Storefront-side and Gateway-composition gap once an Order exists to show (§ Phase E).

---

## 3. Why "Just Call the Backend as a Guest" Doesn't Work Today

This deserves its own section because it is the crux of the sprint, and it would be easy to state imprecisely. The backend's `CheckoutSession` model natively supports a guest (`customer_id = null`). But **every route that touches it still requires a Sanctum-authenticated staff session with a specific permission** (`checkout.sessions.manage`, etc.) — there is no distinction in the route layer between "a staff member is doing this" and "a shopper is doing this." `StartCheckoutAction::execute()` even takes an explicit `?string $actorId` parameter separate from `customer_id`/`guest_email` — the design already anticipates a caller acting *on behalf of* a customer or guest, audited by who that caller was. Today, the only entity that could plausibly be that caller is a staff user (e.g., a phone-order-taking flow in `apps/admin`) — not an anonymous browser.

This confirms the module was built, correctly, as **staff-assisted checkout infrastructure first** (phone orders, customer service, POS-style flows) — a real and valuable capability in its own right — with public/guest self-service checkout named as a distinct, later consumer of the same aggregate, exactly as `PermissionRegistry`'s own docblock states: *"A future storefront-facing Checkout surface, once one exists, would be a new set of routes under a new guard, not a change to this registry."*

---

## 4. Risks

- **Building a fake Storefront checkout that "looks done" would be a severe regression against this entire engagement's own anti-fabrication discipline.** Every prior milestone's honesty about empty states/inert buttons has been the platform's actual credibility. A Checkout UI that submits into nothing, or that talks to the backend through a workaround (embedding a staff credential in the Gateway without proper scoping, or worse, in browser-reachable code) would be a security regression, not a feature.
- **Scope creep into backend/auth engineering.** Provisioning a write-scoped Gateway service credential is small, safe, additive backend/ops work (a new service-role composed from *already-defined* permissions — no new business logic). Designing and building a full customer authentication guard is a substantial, security-sensitive backend module in its own right (password policy, session/token mechanism, MFA posture, account-recovery flow) — attempting it inside a "frontend commerce sprint" without dedicated backend design/review would be the highest-risk mistake this sprint could make.
- **Checkout↔Shipping and Checkout↔Payment composition gaps are real integration risk even once auth exists** — they are not automatically solved by fixing Category B. Both need deliberate design (see §8, steps 4–5).
- **Idempotency at the Gateway layer.** The backend's own `SubmitCheckoutAction` is idempotent given a stable `idempotency_key`; the Gateway must generate and persist that key correctly per attempt (e.g., derived from the guest session, not regenerated per retry) or the backend's own guarantee is wasted.

## 5. Scalability

The backend side is already built for real concurrency: row-level locking (`lockForUpdate()`) on submission, optimistic locking (`lock_version`) on every other mutation, a genuine saga (not a monolithic cross-aggregate transaction) so a slow Inventory reservation never holds a lock on Promotions or Orders. This is materially more scalable than a naive single-transaction checkout would be. The real scaling risk is entirely at the not-yet-built layer: a Gateway-side anonymous-cart/session store needs to be a real distributed cache (Redis, not in-process memory) the moment more than one Gateway instance runs — in-process session state would silently break the moment this platform is horizontally scaled, which a Sprint 3 building for "millions of orders" must design for from the start, not retrofit later.

## 6. Enterprise & Bangladesh Concerns

Enterprise: multi-currency exists structurally (`CheckoutSession.currency_code`, `Payment` presumably currency-aware — not yet re-verified line-by-line, flagged for Phase D/verification), but no multi-tenant scoping exists anywhere yet beyond a single hardcoded `TenantId::DEFAULT` (confirmed in `CheckoutSession::booted()`) — a real, named blocker for the "later becomes a multi-tenant SaaS" objective this sprint states, out of this sprint's own declared scope (Commerce Engine, not multi-tenancy) but worth recording here so it isn't lost.

Bangladesh: is the strongest part of the current backend, not the weakest — COD-as-first-class-gateway, bKash/Nagad/SSLCommerz gateway contracts, and Pathao/Steadfast/RedX/Paperfly/Sundarban courier contracts already exist. The gap is composition and exposure, not design. Full detail in `BANGLADESH_COMMERCE_READINESS.md`.

## 7. The Real, Buildable Path Forward (Not a Workaround)

Two capabilities are genuinely independent of Category B and buildable today, exactly as the platform's own Accepted architecture already specifies:

- **`docs/frontend/STORE_API_GATEWAY_ARCHITECTURE.md` §2.2** and **`STORE_FRONTEND_ARCHITECTURE.md` §3.3** both already state, verbatim, the correct design: *"Anonymous cart state lives client-side (`localStorage`) until a `CheckoutSession` is actually needed"* — i.e. a real Cart requires **zero backend calls** for add/remove/update/quantity/clear. This is Phase B, and it ships this sprint, real and complete — see `BETA_CART_ENGINE_REPORT.md`.
- Everything past "proceed to checkout" needs a backend call, and today that call has nowhere authenticated to go. Phase C is therefore built as far as it honestly can be — real Address/Summary/Review UI operating on the client-side cart, a real, typed Gateway contract for what Checkout composition *will* call — with the actual submission wired against a documented, clearly-marked integration point rather than a live call that would either fail or require an unsafe workaround. See `BETA_CHECKOUT_ENGINE_REPORT.md` for the precise line.

## 8. Recommended Implementation Order

This is the section the sprint brief asks for explicitly, and it changes the originally-implied order (build Cart, then Checkout, then Bangladesh, then Order Success, straight through) — with technical justification, per the sprint's own instruction to document a roadmap change rather than force the existing plan:

1. **Cart Engine (this sprint, real, complete).** Zero backend dependency — ship it fully. See Phase B.
2. **Backend: provision a write-scoped Storefront Service credential** (a new service-role composed from already-existing permission definitions: `checkout.sessions.manage`, `checkout.sessions.view`, `shipping.rates.view`, and — once wired — `payments.payments.manage`) **and extend `BackendClient` with `post`/`patch`/`delete`.** Small, safe, additive, no new business logic, no new auth model — recommended as the very next piece of backend/ops work, ahead of any full customer-auth-guard design, because it alone unblocks real *guest* checkout end-to-end without waiting for #4.
3. **Gateway: a real Guest Cart/Session bridge** — mint the Gateway's own opaque, HttpOnly-cookie session at "Start Checkout," backed by Redis (per §5's scalability requirement), mapping that session to a real `CheckoutSession.id`; every subsequent cart-to-checkout call the Gateway makes uses its own credential from #2, addressed by that mapping — the shopper's browser never holds, or needs, a backend credential of any kind.
4. **Backend/Gateway: wire Checkout ↔ Shipping** (replace `ShippingOptionCatalog`'s flat 3 options with a real `shipping/quote` call) **and Checkout submission ↔ Payment initiation** (call `POST /payments` immediately after a successful `SubmitCheckoutAction`, using the session's chosen gateway).
5. **Storefront: real Checkout UI** against #3/#4 — Address, Shipping, Review, Submit, Payment redirect/instructions.
6. **Order Success / tracking / invoice.** Depends only on #5 producing a real Order — otherwise independent, could run in parallel with #4/#5's later steps.
7. **Backend (separate, dedicated effort, explicitly out of this sprint's scope): the customer authentication guard** — required before an authenticated customer gets a persistent, cross-device cart/order-history/account, but not required for #1–#6 to deliver a fully real guest checkout first. Recommending this be sequenced *after* guest checkout ships, not before — guest checkout is the higher-value, lower-risk unlock, and Bangladesh ecommerce is guest-checkout-first by market norm in any case (`MERCHANT_CONVERSION_AUDIT.md` Part 3 already recommended this posture).

This reorders the sprint brief's own Phase B→C→D→E→F sequence only in *degree of real backend wiring achievable this sprint*, not in scope: Phase B ships complete; Phase C ships as much real UI as is honest today, with the exact remaining integration point named precisely rather than faked; Phases D/E become primarily architecture-and-audit documents (much of D's "design" ask is, in fact, already built — verifying and documenting it accurately is the real work); Phase F proceeds as a pure audit, unaffected by any of this.
