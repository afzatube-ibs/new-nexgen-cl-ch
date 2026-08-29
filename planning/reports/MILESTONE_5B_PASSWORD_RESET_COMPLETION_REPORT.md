# Milestone 5b — Password Reset — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`, per Milestone 5's own confirmed sequencing ("Password reset is a deliberate, explicit fast-follow — Milestone 5b").

## Part 1 — What Shipped

### Backend

- **`customer_password_reset_tokens` migration** (new) — the exact table `config/auth.php`'s own pre-existing docblock named as missing ("no password_reset_tokens table exists... add both together when password reset is actually implemented"). Deliberately its own table (not a shared/staff one), email-keyed, storing only a hash of the real token — mirrors Laravel's own `DatabaseTokenRepository` shape.
- **`CustomerPasswordResetToken`** model (new).
- **`Actions\RequestPasswordResetAction`** (new) — a request against an unknown email is a genuine, silent no-op: no token, no email queued, no audit entry naming a nonexistent account. The caller-visible response is identical either way.
- **`Actions\ResetPasswordAction`** (new) — verifies the real plaintext token against the stored hash (`Hash::check`) and a 60-minute expiry window; an unknown email, wrong token, and expired token all throw the identical `PasswordResetFailedException`. Revokes every one of the customer's existing Sanctum tokens on success — a session started before a reset must not silently survive it.
- **`CustomerPasswordResetController`** (new) — `forgot`/`reset`, both genuinely public (no `auth:sanctum`).
- New, dedicated `password-reset` RateLimiter (3/minute by email+IP, registered in `CustomersServiceProvider`) — deliberately tighter and separate from the `login` limiter `customers/login` already reuses: a forgot-password request emails a real third party, a spam vector `login` attempts don't share.
- **`SendPasswordResetEmailOnCustomerPasswordResetRequested`** listener (new, in `app/Listeners/`) + `customer.password_reset` notification template — reuses the exact, established Milestone 3 pattern. Builds the real reset link from a new `config('app.storefront_url')` (`STOREFRONT_URL` env var, added to `.env.example`) rather than a hardcoded origin.

### Gateway

- **`routes/customers.ts`**: `POST /v1/customers/password/forgot`, `POST /v1/customers/password/reset` — both public, relayed through `CustomerBackendClient` unchanged.
- **Real, platform-wide bug found and fixed** (see Part 2) in `lib/errors.ts`'s `extractBackendValidationDetails`.

### Storefront

- **`/forgot-password`**, **`/reset-password`** pages (new) — the latter reads `?email=&token=` from the real link the queued email contains.
- **`ForgotPasswordForm`**, **`ResetPasswordForm`** (new, client-safe) — the forgot form shows the identical success message regardless of what actually happened server-side, matching the backend's own anti-enumeration contract; the reset form auto-signs the customer in on success (mirrors `RegisterForm`).
- **`app/api/auth/{forgot-password,reset-password}/route.ts`** (new) — `reset-password`'s route is the one that performs the real auto-login and sets the real session cookie after a successful reset.
- `LoginForm` gained a real "Forgot password?" link.

## Part 2 — Real, Platform-Wide Bug Found and Fixed

Live end-to-end verification (not the test suite — every prior Gateway test stubbed its own fetch response) surfaced that `POST /v1/customers/login` with a wrong password returned a generic `{"error":{"code":"upstream_error", ...}}` / 502, not the real, specific "The provided credentials are incorrect." message.

Root cause: `apps/store-api-gateway/src/lib/errors.ts`'s `extractBackendValidationDetails` had never correctly parsed this backend's actual error envelope. Direct read of `bootstrap/app.php`'s own `$envelope` closure confirmed the ONE, real, platform-wide shape every exception renders through:

```json
{"error": {"type": "validation_failed", "message": "The given data was invalid.", "details": {"email": ["The provided credentials are incorrect."]}}}
```

The function's two prior docblocks each documented a different, incorrect assumption — a bare top-level `errors` key (Laravel's own un-wrapped default, which this backend's global handler always reshapes before it reaches a caller) and a claimed second "Payments-only" shape that turned out to simply be the same envelope with `details` omitted (`array_filter` drops null values). Neither had ever been checked against `bootstrap/app.php`'s own source.

**This bug was not specific to Customer Accounts or password reset** — it affected every Gateway route that could ever surface a real validation failure (422) from the backend, across every module. It went undetected through Milestones 2, 3, and 5 because every existing Gateway test stubs its own fetch response body, and no prior live verification pass happened to exercise a real 422 through the Gateway against the real backend. Fixed in place; the corrected function's own docblock now cites the confirmed source (`bootstrap/app.php`), not an inferred shape.

## Part 3 — Verification

| Check | Result |
|---|---|
| Backend PHPStan | 0 errors |
| Backend Pint | Passed |
| Backend Pest (SQLite) | **1184/1211 passed.** 27 pre-existing failures, unchanged baseline — zero regressions. 8 new tests (`CustomerPasswordResetTest.php`). |
| Gateway typecheck/lint | Clean |
| Gateway tests | **155/155 passed** (153 prior + 2 new). |
| storefront-engine typecheck/lint | Clean |
| storefront-engine tests | **124/124 passed** (119 prior + 5 new: `ForgotPasswordForm.test.tsx`, `ResetPasswordForm.test.tsx`). |
| storefront typecheck/lint | Clean |
| storefront production build | **25/25 pages** — `/forgot-password` static, `/reset-password`/`/api/auth/*` correctly dynamic. |

### Live, end-to-end verification (real backend + real Gateway + real Storefront + real browser)

1. Registered a real customer, requested a password reset via the real Gateway, read the **real, queued email body** directly (Mailgun is unconfigured in this environment, so the notification is real and correctly queued but cannot complete external delivery — the same pre-existing, documented merchant-configuration gap named in Milestone 3's report) — confirmed a real, correctly-formed reset link.
2. Navigated the real browser to that exact link. The real `/reset-password` page correctly parsed `email`/`token` from the URL and rendered the form.
3. Submitted a new password → real reset succeeded → real auto-login → landed on the real `/account` profile page.
4. Confirmed via direct Gateway calls: the **old** password now correctly fails login (422, real "credentials are incorrect" message — this is where the Part 2 bug was caught and fixed), and the **new** password succeeds.
5. All test data (the customer account, its tokens, its password-reset row, its queued notifications) deleted from the dev database afterward.

## Part 4 — Remaining, Honest Gaps

- **Real email delivery** — still gated on real Mailgun/Brevo credentials being configured (pre-existing, named in Milestones 3 and 5, not this milestone's own scope).
- **No "your password was changed" confirmation email** — `CustomerPasswordWasReset` is published but has no listener yet; a reasonable small follow-up, not requested this pass.
- Staff (`User`) password reset remains out of scope — never named as a gap in the Production Completion Plan and not requested.

---
