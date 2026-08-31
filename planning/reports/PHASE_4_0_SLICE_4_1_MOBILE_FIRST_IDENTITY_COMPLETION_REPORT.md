# Phase 4.0 Slice 4.1 — Mobile-First Customer Identity — Completion Report

**Source of truth**: `planning/architecture/PHASE_4_0_BANGLADESH_COMMERCE_ARCHITECTURE.md`, itself written in direct response to the Product Owner's own explicit production requirements (verbatim, 2026-09-01). This slice implements requirement 1 (Customer Authentication) in full, plus the groundwork columns for the Product Owner's own phone-verification addendum (populated by Slice 4.2's OTP module, not this one).

## Part 0 — What Shipped

**Backend** (`apps/backend`):
- New migration `2026_09_01_120000_make_customer_phone_primary_identity.php`: `email` → nullable (was required); `phone_verification_status` (default `unverified`) and `phone_verified_at` columns added; a composite unique index on `(tenant_id, phone)` — standard SQL semantics mean any number of `NULL` phones can coexist while a real phone value stays genuinely unique, so no forced backfill of historical rows was needed.
- `Customer` model: `PHONE_UNVERIFIED`/`PHONE_VERIFIED`/`PHONE_BLOCKED` constants (the Product Owner's own three-state addendum), `isPhoneVerified()` helper.
- `RegisterCustomerRequest`: `phone` → required + unique (was optional); `email` → optional (was required + unique).
- `LoginCustomerRequest`/`LoginCustomerAction`/`CustomerAuthController::login()`: the `email` field replaced by `identifier` (phone- or email-shaped), looked up against both columns via `where('email', ...)->orWhere('phone', ...)`.
- `CustomerAuthenticationFailed` event: `attemptedEmail` renamed to `attemptedIdentifier` (confirmed, via a full-repository search, no other consumer existed).
- `CustomerRegistered` event: `email` widened to `?string`; `SendWelcomeEmailOnCustomerRegistered` now simply does nothing when it's absent, rather than queuing a notification to no address.
- `RequestPasswordResetAction`: unaffected in behavior — password reset stays email-only for this slice (a real, deliberate scope boundary, not an oversight — see Part 3); one PHPStan-caught type fix (pass the original `$email` parameter, not the now-nullable `$customer->email`, into the event it publishes).
- `UpdateMyProfileRequest`/`UpdateCustomerProfileRequest`: `phone` gained a real uniqueness rule (it didn't have one before, since it wasn't the primary identity); `email` gained `nullable` so it can be explicitly cleared.
- The shared `login` rate limiter (`IdentityAccessServiceProvider`, deliberately shared between staff and Customer login per Milestone 5's own precedent) now falls back to `identifier` only when `email` is absent — staff login behavior is byte-for-byte unchanged.
- A real, pre-existing caller found mid-implementation: `Checkout\Actions\SubmitCheckoutAction` also calls `RegisterCustomerAction` (guest-to-customer conversion) with no `phone` key at all — `phone` stays `?? null`-defensive in the shared Action rather than required, since requiring it there would have broken the real, working guest-checkout flow. `guest_phone` is real future work for Slice 4.3, not invented here.

**Gateway** (`apps/store-api-gateway`): `registerBodySchema`/`loginBodySchema` zod schemas updated to match (`phone` required, `email` optional; `identifier` replacing `email` on login) — a thin, honest relay's own schema kept in sync with the real backend request it fronts, never a second independently-maintained copy of its rules.

**Storefront** (`apps/storefront`, `packages/storefront-engine`): `RegisterForm` — mobile number required and first, email hidden behind a "+ Add an email address (optional)" progressive-disclosure toggle; `LoginForm` — a single "Mobile number or email" field; `ProfileEditForm` — phone reordered before email, both correctly null-safe. `CustomerProfile`/`RegisterCustomerInput`/`UpdateMyProfileInput` types and the Route Handlers behind them (`/api/auth/register`, `/api/auth/login`, `/api/account/profile`) all updated to match.

**Admin** (`apps/admin`, `packages/api-client`): `CustomerDTO.email` widened to nullable, `phoneVerificationStatus`/`phoneVerifiedAt` added; `CustomerFormDialog` — phone required and first, email optional; Customers List — Phone column before Email, both null-safe; Customer Detail — a phone-verification-status badge added next to the phone number, header subtitle now shows phone (falling back to email); `LatestCustomersWidget` — same fallback.

## Part 1 — Verification

| Check | Result |
|---|---|
| Backend Pest (Customers/Checkout/Payments/Reviews-adjacent) | **170/170** |
| Backend full suite | 1276/1282 — 6 failures, all pre-existing `NagadGatewayTest` (`openssl_pkey_export(): Cannot get key from parameter 1`, an environment-level OpenSSL quirk unrelated to this slice — confirmed zero references to Customer/phone/email in that file, not in this slice's diff) |
| Backend PHPStan | Clean (1 real nullable-type issue caught and fixed — `RequestPasswordResetAction`) |
| Backend Pint | Clean |
| Gateway typecheck/lint/tests | Clean, 164/164 (2 new: phone-as-identifier login, missing-phone registration 400→422) |
| `storefront-engine` typecheck/lint/tests | Clean, 135/135 (`RegisterForm`/`LoginForm` tests rewritten for the new fields) |
| `apps/storefront` typecheck/lint/build | Clean |
| `api-client` typecheck/tests | Clean, 223/223 |
| Admin typecheck/lint/tests/build | Clean, 171/171 |

### Live, end-to-end verification (real backend + real Gateway + real Storefront + real Admin, real browser)
- **Storefront registration**: registered "QA Milestone Test" with phone `01911223344` and no email at all — real account created, auto-logged-in, landed on the real `/account` profile page showing the phone number and an empty, optional email field.
- **Storefront login**: signed out, then signed back in using the phone number alone via the "Mobile number or email" field — succeeded, landed on the real profile page again.
- **Admin**: Customers List now shows Phone before Email (a real historical row with a cleared phone, from this session's own earlier duplicate-phone resolution, correctly renders "—"); New Customer dialog shows Mobile number as the first, required field, Email marked Optional.
- All test data cleaned up (customer account force-deleted; temp QA admin account tokens revoked, role detached, force-deleted).

## Part 2 — A Real Data Issue Found and Resolved Mid-Migration

Adding the real `(tenant_id, phone)` unique constraint failed on first attempt: this environment's own dev database already had two genuine, distinct customer rows (different names, emails, and creation dates — both real accounts from earlier live-verification passes this session) that happened to share one phone number, since nothing enforced uniqueness on it before. Resolved by clearing the phone on the older of the two rows (it keeps working via email login, per this slice's own least-disruptive design) rather than fabricating a new value — the same discipline applied to every real data issue found this session.

## Part 3 — Deliberately Not Built In This Slice

- **Phone-based password reset / account recovery** — stays email-only; a real, OTP-dependent capability that belongs with Slice 4.2's OTP module, not invented ahead of it.
- **Guest checkout by phone** — `Checkout`'s own guest path (`guest_email`/`guest_name`) is real, working, and untouched; `guest_phone` is Slice 4.3's own explicit scope.
- **Phone number format validation/normalization** (e.g. Bangladesh-specific `01XXXXXXXXX` pattern enforcement, country-code normalization) — accepted as freeform text for this slice, matching how `email` was validated before it (format-checked, not normalized); a real, worthwhile follow-up but not blocking identity itself.
- **Populating `phone_verification_status` beyond its `unverified` default** — the column and the three-state model exist now; only Slice 4.2's OTP module can actually earn a `verified` state.

## Part 4 — Final Classification

**Production ready**, within this slice's own explicit scope. Closes the Product Owner's requirement 1 in full: mobile number is now the required, primary, unique identity; email is optional; registration is mobile-first; login supports both mobile number and email.

## Part 5 — Roadmap Correction

Recorded in `planning/reviews/PRODUCTION_COMPLETION_PLAN_v2.md` under the Phase 4.0 pointer. Next: Slice 4.2 (OTP Module + Admin Settings).

---
