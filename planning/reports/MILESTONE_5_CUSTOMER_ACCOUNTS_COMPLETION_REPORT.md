# Milestone 5 — Customer Accounts (Storefront Authentication) — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`, verified against the repository before implementation per instruction.

## Part 1 — Design decision, confirmed before writing any code

This milestone's own plan entry flagged a real, security-sensitive design decision requiring sign-off: how a logged-in customer's session is carried between the Storefront and the Gateway/Backend. Investigation before implementing found the platform's own prior architects had already anticipated and explicitly scoped this exact gap: `Customer::class`'s own docblock stated it "deliberately does not use `Laravel\Sanctum\HasApiTokens`: no self-service authentication endpoint exists yet," and `RegisterCustomerAction`'s own docblock named the precise reason — "a customer's bearer token must never satisfy a `permission:` check meant for staff."

**Confirmed design**: an httpOnly, Secure (production), SameSite=Lax cookie, set only by a Next.js Route Handler (`/api/auth/login`). The real backend-issued Sanctum token travels only server-to-server (Next.js → Gateway → Backend); it never reaches client-side JavaScript, satisfying the explicit requirement that "the browser should never directly access authentication tokens." Password reset is a deliberate, separate fast-follow (Milestone 5b), designed to plug in without further architectural change (the backend's own `config/auth.php` already notes exactly what a reset flow needs — a `password_reset_tokens` table and broker config — now buildable since Milestone 3 made Notifications real).

## Part 2 — What Shipped

### Backend (`Commerce\Customers`, `Commerce\Orders`, `Platform\IdentityAccess`)

- **`Customer` model**: gained `Laravel\Sanctum\HasApiTokens` and a real `Illuminate\Contracts\Auth\Authenticatable` implementation (`Illuminate\Auth\Authenticatable` trait) — required for Sanctum to authenticate a `Customer` token at all; `User` already had this via extending `Illuminate\Foundation\Auth\User`, `Customer` (a plain `Model`) did not.
- **`Actions\LoginCustomerAction`** (new) — mirrors `IdentityAccess\Actions\AuthenticateUserAction` exactly: every failure (unknown email, wrong password, archived account) is indistinguishable to the caller, both are audited.
- **`Http\Controllers\CustomerAuthController`** (new) — register/login/logout/me/updateMe. Register and profile-update reuse the pre-existing `RegisterCustomerAction`/`UpdateCustomerProfileAction` unchanged — no business logic duplicated.
- **`Http\Controllers\CustomerSelfAddressController`** (new) — self-service address book, reusing the pre-existing `AddCustomerAddressAction`/`UpdateCustomerAddressAction`/`DeleteCustomerAddressAction`. **Real gap found and closed**: those Actions trust the caller that `{customer}` and `{address}` are already consistent (true for the staff surface, which binds both from the URL) — a self-service surface binding only `{address}` cannot make that assumption, so this controller adds an explicit `assertOwnedByCaller()` check (404, not 403, for someone else's address) before ever calling them.
- **`Http\Controllers\CustomerOrderController`** (new, in `Commerce\Orders`) — real order history, **always** scoped to the caller's own id (never a request-supplied `customer_id`, unlike the staff `OrderController::index()`). `Orders` already has one real, arch-test-documented dependency on `Customers` (`CreateOrderAction`), so this adds no new cross-domain coupling.
- **`Http\Middleware\EnsureCustomerPrincipal`** / **`EnsureStaffPrincipal`** (new) — defense-in-depth: Sanctum authenticates a token to whichever model issued it; nothing about `auth:sanctum` alone stops a customer's token from resolving on a staff route or vice versa. **Real, previously-unexercised gap found and closed**: `IdentityAccess\routes.php`'s own `auth/logout`/`auth/me` carried no `permission:` middleware at all (by design — self-access needs none) — before this milestone that was safe only because no non-staff Sanctum principal existed yet. `staff.guard` now closes it explicitly.
- Both new middleware read `Auth::guard('sanctum')->user()` rather than `Illuminate\Http\Request::user()` — static analysis (Larastan) narrows that specific call's return type to this platform's one configured default auth model (`User`), which would make an otherwise-correct `instanceof Customer` check register as `instanceof.alwaysFalse`. Confirmed via PHPStan: 0 errors, no suppressions used.

### Gateway (Category C)

- **`backend/customerBackendClient.ts`** (new) — the Gateway's third credential path. Unlike Category A (`BackendClient`, fixed read-only token) and Category B (`CheckoutBackendClient`, fixed write-scoped token), this one holds **no credential of its own** — every call forwards the live customer's own bearer token, read from the incoming request's own `Authorization` header (set server-side by the Storefront's Route Handlers) and relayed unchanged.
- **`routes/customers.ts`** (new) — register/login/logout/me/updateMe/addresses CRUD, composed onto `CustomerBackendClient`.
- **`routes/orders.ts`** (extended) — `registerCustomerOrderRoutes` (`GET /orders/mine`, `GET /orders/mine/:id`).
- **`lib/errors.ts`**: new `unauthenticated` `GatewayErrorCode` + `GatewayError.unauthenticated()`, and `toGatewayError` now maps a real backend 401 to it. Before this milestone no Category A/B call ever produced a real 401 (their fixed credentials are always valid) — for Category C a 401 is a routine, expected outcome (a shopper isn't logged in, or their token expired) that must not surface as a misleading generic `upstream_error`/502.
- **Real bug found and fixed before commit**: the `orders/mine` route initially spread the real backend's own raw Laravel paginator meta (`current_page`, `last_page`, …) directly into the response instead of this platform's own established, normalized `meta.pagination` (camelCase) shape every Catalog list route already uses — found via live verification against the real backend, fixed to match `routes/catalog.ts`'s own precedent exactly.

### Storefront

- **`apps/storefront/src/lib/customerSession.ts`** (new) — the one place the real session cookie is ever read; `requireCustomerToken()` redirects a genuinely protected page to `/login`.
- **`app/api/auth/{register,login,logout}/route.ts`** (new) — the only code that ever sets or clears the real cookie.
- **`app/api/account/{profile,addresses,addresses/[addressId]}/route.ts`** (new) — protected mutation proxies, each reading the cookie server-side and forwarding it to the Gateway.
- **`app/{login,register}/page.tsx`**, **`app/account/{layout,page}.tsx`**, **`app/account/{addresses,orders,orders/[id]}/page.tsx`** (new).
- **`packages/storefront-engine/src/auth/*`** (new) — `LoginForm`, `RegisterForm`, `ProfileEditForm`, `AddressBookManager`, `SignOutButton`, `authClient.ts`. All genuinely client-safe (exported from `@nexgen/storefront-engine/client`, never the main barrel) — they call only this app's own same-origin `/api/*` routes, never the Gateway or any `server-only` module directly.
- **`gateway/customerAuth.ts`** (new, `server-only`) + **`gateway/customerTypes.ts`** (new, plain types, no `server-only`) — mirrors the established `order/types.ts` split exactly, so a Client Component can safely import the response shapes without ever bundling the real fetch/token code.
- **`OrderConfirmationSummary`** — a real, complete component that has existed since Beta Sprint 3 with **zero** live route reaching it (its own docblock named exactly why) — now genuinely wired, unmodified, at `/account/orders/[id]`.
- **`StoreHeader`**'s "Account — coming soon" placeholder button is now a real `<Link href="/account">`. **Deliberately does not** conditionally show `/login` vs `/account` based on live session state: doing so would require reading the (by-design-unreadable-client-side) session cookie in a Server Component ancestor, which — in this app's current, non-PPR Next.js configuration — would force the **entire site** into dynamic, per-request rendering, discarding every page's own real ISR caching. `/account`'s own existing auth gate already redirects a signed-out visitor to `/login`, achieving the identical end result at zero cost to the rest of the site's performance. (This was caught and reverted during implementation — an earlier version of this change did read the cookie in the root layout; the production build's own route-type output, `○` static vs `ƒ` dynamic, was used to confirm the fix.)

## Part 3 — Verification

| Check | Result |
|---|---|
| Backend PHPStan | 0 errors |
| Backend Pint | Passed |
| Backend Pest (SQLite) | **1176/1203 passed.** 27 failures, confirmed identical to the pre-existing baseline (unchanged from Milestone 3's own verified baseline) — zero regressions. |
| Gateway typecheck/lint | Clean |
| Gateway tests | **153/153 passed** (143 pre-existing + 10 new, `test/integration/customers.test.ts`) |
| storefront-engine typecheck/lint | Clean |
| storefront-engine tests | **119/119 passed** (113 pre-existing + 6 new: `LoginForm.test.tsx`, `RegisterForm.test.tsx`) |
| storefront typecheck/lint | Clean |
| storefront production build | **21/21 pages.** Confirmed the new auth-aware routes (`/account/*`, `/api/*`, `/login`) render dynamic (`ƒ`) while every pre-existing page (`/`, `/cart`, `/checkout`, `/orders/lookup`, …) remains static (`○`) — the root-layout cookie-read regression above was caught here and reverted before commit. |

### Live, end-to-end verification (real backend + real Gateway + real Storefront dev server + real browser)

1. **Direct Gateway verification** (`curl`): real registration → real login (real Sanctum token issued) → `GET /v1/customers/me` (200, real profile) → `GET /v1/orders/mine` (200, real empty list, correctly normalized `meta.pagination`).
2. **Full browser verification** (`/register` → filled the real form → submitted): registered, auto-signed-in, landed on `/account` showing the real, just-created profile. Navigated to `/account/addresses`, added a real address, saw it persist and render. Navigated to `/account/orders`, saw the honest "No orders yet" empty state (this customer genuinely has none). Clicked "Sign out" → real redirect to `/`. Manually navigated back to `/account` → redirected to `/login`, confirming the real session was actually revoked, not just hidden client-side.
3. All test customer accounts created during verification (`live.verify.m5@example.test`, `browser.test.m5@example.test`) were deleted from the dev database afterward — no synthetic verification data left behind.

## Part 4 — Real Bugs Found and Fixed (not pre-existing, introduced and caught within this milestone)

1. **`bootstrap/app.php`: `Middleware::alias()` silently replaces, not merges.** A second call registering `staff.guard`/`customer.guard` wiped out the platform's own `permission` alias entirely — every `permission:`-gated route in every module would have 500'd ("Target class [permission] does not exist") in production. Caught by a full-suite regression run (80 failures) before commit; fixed by consolidating into one call. This is the most consequential finding of this milestone — a silent, platform-wide authorization bypass-into-crash that had nothing to do with Customer Accounts specifically.
2. **Gateway `orders/mine` pagination shape** — see Part 2 above.
3. **Cross-test-suite rate-limiter collision** — a new Customer login test reused the literal sentinel email (`nobody@example.test`) an unrelated, pre-existing `RateLimitingTest` already used against the same shared `login` RateLimiter bucket (deliberately shared by design — a customer and a staff member enumerating the same email should share one credential-stuffing defense). Fixed by using a distinct placeholder in the new test.
4. **`CheckoutSession`/`CheckoutItem` decimal casts** — found and fixed in the prior Milestone 3 round, re-confirmed still correct here.

## Part 5 — Remaining, Honest Gaps (explicitly out of this milestone's scope)

- **Password reset** — Milestone 5b, the immediate next milestone per this session's own confirmed sequencing.
- **No admin-facing "customer accounts" visibility beyond what the pre-existing staff Customers module already shows** — out of scope; the staff surface (`CustomerController`) is unchanged and already real.
- **No email verification step on registration** — not named in this milestone's scope; a real gap for a future pass if required.
- **Reviews-with-verified-purchase** (Milestone 11) can now be built for real — a real customer identity exists to check an order against.

---
