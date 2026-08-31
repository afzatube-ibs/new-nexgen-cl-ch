# Phase 4.0 — Bangladesh Commerce & Trust Platform — Architecture Research

**Status**: Architecture research only. No code changes in this pass. Written in response to the Product Owner's explicit production requirements (verbatim, 2026-09-01) covering: mobile-first Customer identity, a pluggable OTP module, a Bangladesh-optimized/conversion-focused Checkout redesign, guest checkout preservation, a production-grade Fraud Prevention engine, Bangladesh commerce optimization generally, cross-cutting integration (not isolated features), and documentation updates.

Every finding below is a direct repository read, not an assumption — file paths and line-level facts are cited so this document can be re-verified by anyone at any time. Follows this codebase's own established discipline (Phase 2.4 Pricing, Phase 2.9 Payments, Phase 3.0 Marketing): a research-only pass, reviewed before any implementation slice begins.

---

## Part 0 — Why This Is One Phase, Not Six Milestones

The Product Owner's own requirement 7 is explicit: *"Do NOT implement these as isolated features… Integrate them into: Customer Accounts, Checkout, Identity, Settings, Notifications, Admin, Orders, Fraud engine."* Every one of the six numbered requirements touches the same two real aggregates (`Customer`, the Checkout session) and the same real cross-cutting seam (Notifications' pluggable channel-provider contract). Treating them as six independent milestones — this session's pattern for the last several fixes — would mean redesigning the Customer/Checkout data model five separate times. This is sized and sequenced as a single Phase with dependent Slices instead, matching Phase 2.9 (Payments) and Phase 3.0 (Marketing)'s own shape.

---

## Part 1 — Verified Current State (Per Requirement Area)

### 1. Customer Authentication — currently email-first, phone genuinely optional

- `customers` table (`database/migrations/2026_08_03_150001_create_customers_table.php`): `email` — `string`, **required**, unique per `(tenant_id, email)`. `phone` — `string`, **nullable**, **no uniqueness constraint at all**.
- `RegisterCustomerRequest`: `email` → `required|email|unique:customers,email`; `phone` → `nullable|string|max:50`. Registration is impossible without an email today.
- `LoginCustomerRequest` / `CustomerAuthController::login()`: authenticates by `email` + `password` only. No phone-based login path exists anywhere.
- **Gap vs. requirement**: exact inverse of what's asked. Mobile must become the required, unique primary identity; email must become optional.

### 2. OTP Verification — zero existing code

- Repository-wide search (`otp`, `one-time password`, `verification_code`) returns nothing in `app/` or `database/migrations/`.
- **What already exists and is directly reusable**: Notifications' own channel abstraction is *already* designed for exactly this kind of pluggability. `Channels\Contracts\NotificationProviderContract` (`app/Domains/Operations/Notifications/Channels/Contracts/NotificationProviderContract.php`) is explicitly documented: *"adapter/plugin based, never hardcoded into the notification engine… a future provider… becomes a new class implementing this interface plus a `ProviderFactory` case and a config entry — never a change to `Models\Notification`, any Action, or any controller."* Only `email` has a real implementation today (`SmtpEmailProvider`/`MailgunEmailProvider`/`SesEmailProvider`/`BrevoEmailProvider`); `sms`/`whatsapp` are declared channel values (`NotificationTemplate::CHANNELS`) with **no real provider implementation yet** — sending an OTP by SMS requires building the first real SMS provider, using the contract that already exists for it.
- **Gap vs. requirement**: a new OTP domain module (generate/verify/expire/rate-limit codes, per-purpose enable/disable) does not exist; a real SMS delivery provider does not exist; Admin settings for OTP toggles do not exist.

### 3. Checkout UX — generic international address shape, most fields optional

- `SetCheckoutAddressRequest` (`app/Domains/Commerce/Checkout/Http/Requests/SetCheckoutAddressRequest.php`): `recipient_name`/`address_line1`/`city`/`country_code` required-without-saved-address; **`phone` is `sometimes|nullable`** — genuinely optional today, the opposite of the new requirement. Fields are generic (`city`, `region`, `postal_code`) — no Division/District/Upazila structure anywhere.
- Same generic shape repeated in `customer_addresses` (`database/migrations/2026_08_03_150002_create_customer_addresses_table.php`) and in Store Configuration's own address fields — a genuinely shared, reused shape across three tables, not a Checkout-only concern.
- **Gap vs. requirement**: phone must become required at checkout; a Bangladesh Division → District → Area/Upazila cascade does not exist as data or as UI; email must become optional/hidden-by-default in the Storefront checkout form (a pure frontend change, since `SubmitCheckoutRequest`'s guest path already treats `guest_email` as one of two alternatives, not something universally required — see below).

### 4. Guest Checkout — already fully real and working

- `StartCheckoutRequest` (`app/Domains/Commerce/Checkout/Http/Requests/StartCheckoutRequest.php`): accepts **either** `customer_id` **or** the pair `(guest_email, guest_name)` — enforced by a `withValidator` closure requiring exactly one path, confirmed by direct read (lines 39–51). Guest checkout, login-before-checkout, and register-during-checkout (via `customer_id` once a session exists) are **all already real, working capabilities today**.
- **Gap vs. requirement**: none structurally — the one real gap is that the guest path identifies a guest by `guest_email`/`guest_name` only, no `guest_phone`, which is inconsistent with mobile-first identity for the same reason as #3 above. This is a small, additive fix (add `guest_phone`, make it the primary guest-identifying field), not a redesign — the existing OR-logic is sound and stays.

### 5. Fraud Prevention — zero existing code

- Repository-wide search (`fraud`, `blacklist`, `risk.scor`, `velocity`) returns nothing structurally relevant — a fresh domain module, built from nothing, exactly like Reviews was in Milestone 11.
- **What already exists and is directly reusable as inputs to a risk score**: real Checkout audit log (`Checkout\Audit\AuditLogger`, real per-session event trail); real order data (`customer_id`, IP is **not** currently captured anywhere on `Order`/`Checkout` — confirmed no `ip_address` column on either table, a genuine new-column gap for "same IP excessive orders"); Notifications' own audit-log/permission pattern (mirrored by every other module this session already touched) is the template for a Fraud Audit Log and an Admin dashboard.
- **Gap vs. requirement**: entirely new — data model (risk rules, scores, blacklist/whitelist entries, manual review queue, fraud audit log), an `ip_address` column addition to the Checkout/Order aggregate, a device-fingerprint field (storage only in this phase — no real fingerprinting SDK integrated, per the requirement's own "future-ready" qualifier), a configurable action-per-check policy (Block/Warn/Manual-review/Disable), and a new Admin `fraud` module.

### 6. Bangladesh Commerce Optimization — an outcome of 1/3/4/5, not a separate system

- COD already exists as a real, working payment gateway (confirmed earlier this session: `BankTransferGateway`'s sibling, `Payments\Gateways`; COD needs no credentials by design). "COD-first experience" is a Checkout *default/ordering* decision (surface COD first in the payment-method list for BD storefronts), not new backend capability.
- "Courier-aware checkout" — Shipping already has a real, live rate-quote engine (`CalculateShippingRateAction`, wired into Checkout since this session's own Milestone 1). No new backend capability needed; this becomes a Division/District-aware rate lookup once #3's address model lands.
- **Conclusion**: requirement 6 has no independent backend surface of its own — it is realized entirely by correctly building 1, 2, 3, 4, and 5. Tracked here as a checklist, not a seventh subsystem.

### 7. Phone Verification State (Product Owner's own addendum)

- No `phone_verified_at`/status field exists on `Customer` today (mirrors how `email_verified_at` doesn't exist either — this platform's Customer auth has never had any verification-state concept).
- Directly buildable as a new `Customer` column once the OTP module (#2) exists to set it. The addendum's own UX rule — *"don't ask for OTP on every order unless the merchant enables 'Always verify checkout'"* — is a real, concrete Admin-configurable Fraud/OTP policy toggle, sequenced into Slice 4 below.

---

## Part 2 — Proposed Design (Consistent With Every Existing Module's Own Conventions)

### Customer identity (extends the existing `Customers` domain — no new module)
- Migration: `phone` → required, unique per `(tenant_id, phone)`; `email` → nullable, unique constraint changes to a *partial* uniqueness (Laravel: unique with a `whereNotNull` scope, or a DB-level partial index) so multiple customers can share a `NULL` email. Add `phone_verified_at` (nullable timestamp) and `phone_verification_status` (`unverified` default, `verified`, `blocked` — the addendum's three states) columns.
- `RegisterCustomerRequest`/`LoginCustomerRequest`: swap required/optional; add a phone-based login path (`CustomerAuthController::login()` accepts `phone` OR `email`, mirroring Checkout's own existing OR-pattern in `StartCheckoutRequest` — reusing an established idiom, not inventing a new one).
- **No new module** — this is entirely inside the existing `Customers` domain, matching "do not create duplicate systems."

### OTP module (new domain: `App\Domains\Platform\OneTimePassword`, platform-level — used by Customers, Checkout, and (optionally) Orders, so it belongs beside Notifications/StoreConfiguration/IdentityAccess, not nested inside Customers)
- New aggregate: `OtpChallenge` (id, purpose [`registration`|`login`|`checkout`|`order_confirmation`], destination [phone, occasionally email], code hash — never the raw code at rest, expires_at, attempts, max_attempts, status, tenant_id).
- Delivery via a **new** `Channels\SmsProviderContract`-conformant provider in Notifications (reusing the exact seam that already exists for this — `NotificationProviderContract`), plus a `LogSmsProvider` (dev/test — writes to log instead of a real gateway, mirroring how this environment's real Redis/dev-server constraints were handled all session) so this ships fully functional in every environment before a merchant configures a real Bangladesh SMS gateway (e.g., a local aggregator) — the same "resolver refuses an unavailable provider" pattern `ProviderResolver` already enforces for email.
- Admin settings: four independent booleans (`otp.registration.enabled`, `otp.login.enabled`, `otp.checkout.enabled`, `otp.order_confirmation.enabled`) plus the addendum's `otp.checkout.always_verify` — a new `Settings` value object *inside the OTP module itself* (matching "OTP is a configurable platform feature" — it owns its own configuration, the same way every other module in this codebase owns its own permissions/settings rather than a shared global settings blob).
- Rate-limiting/attempt-limiting is intrinsic to `OtpChallenge` (max_attempts column), not bolted on separately.

### Checkout UX
- `SetCheckoutAddressRequest`/`customer_addresses`: add `division`, `district`, `area` columns (Bangladesh) alongside the existing generic `region`/`city` (kept for non-BD tenants — `country_code` already exists and lets the Storefront conditionally render BD-specific cascading selects vs. the generic form); `phone` becomes required.
- `StartCheckoutRequest`: add `guest_phone` (required for the guest path, replacing `guest_email` as the primary identifying field; `guest_email` stays present but becomes optional).
- Storefront-only changes (no new backend capability beyond the above): collapse the checkout form to Name/Phone/Address/Division/District/Area, email field hidden behind a "have an email? (optional)" progressive-disclosure toggle. COD surfaced first in the payment-method list for BD storefronts (a Storefront ordering decision, not a backend one).

### Fraud Prevention module (new domain: `App\Domains\Operations\Fraud`, an Operations-tier module beside Notifications/Returns/Shipping — reacts to Checkout/Orders via the event bus, exactly like Notifications does, never a direct dependency in the other direction)
- New aggregates: `FraudRule` (type: velocity/duplicate/blacklist/whitelist/ip-limit/device, config, action: block/warn/manual_review/disabled, enabled flag — each independently toggleable per the requirement), `FraudCheckResult` (per-order/per-checkout, the rules that fired, the resulting risk score, the resulting action taken), `FraudListEntry` (blacklist/whitelist, by phone/email/IP), a `ManualReviewQueue` view over flagged `FraudCheckResult`s, and a Fraud Audit Log (mirrors every other module's own `Audit\AuditLogger`).
- Listens to the same real `CheckoutSubmitted`/`OrderPlaced`-class events every other module already reacts to (Notifications' own `SendOrderConfirmationOnOrderPlaced`-style listener is the direct template) — never a new synchronous dependency Checkout must call into, preserving Checkout's existing boundaries.
- `ip_address` column addition to Checkout's own session record (the one real new column on an *existing* aggregate this phase needs, beyond Customer's own).
- Admin `fraud` module: dashboard (mirrors Milestone 12's `ProductionReadinessWidget` pattern for the summary tiles), Manual Review Queue list (mirrors Reviews'/Returns' own moderation-queue UI pattern exactly), Blacklist/Whitelist management, Fraud Rule configuration, Fraud Audit Log.

---

## Part 3 — Proposed Slice Sequencing

Numbered independently from the Production Completion Plan v2's own Milestones 1–17 (this is a new Phase, not a further milestone in that list) — `PRODUCTION_COMPLETION_PLAN_v2.md` gets a pointer to this document rather than absorbing it, matching how Phase 2.9/3.0 each got their own architecture doc referenced from `PROJECT_STATUS.md` rather than folded into an unrelated plan file.

| Slice | Scope | Depends on |
|---|---|---|
| **4.1 — Mobile-First Customer Identity** | `customers` migration (phone required+unique, email optional), Register/Login request + controller changes, phone-based login, `phone_verified_at`/`phone_verification_status` columns (unset until 4.2 exists to populate them), Admin/Storefront UI updates. | Nothing — can ship standalone. |
| **4.2 — OTP Module + Admin Settings** | New `OneTimePassword` domain, `LogSmsProvider` (dev-functional SMS), Admin OTP settings panel (4 toggles + "always verify checkout"), wired into Registration and Login (Checkout OTP deferred to 4.3, since Checkout's own request shape changes there anyway). | 4.1 (needs a real phone to send an OTP to). |
| **4.3 — Checkout UX Redesign + Guest Phone** | Address model BD fields, required checkout phone, `guest_phone`, Storefront checkout form redesign (progressive email disclosure, COD-first for BD), Checkout OTP wired in. | 4.1, 4.2. |
| **4.4 — Fraud Prevention Engine** | New `Fraud` domain, `ip_address` capture, rule engine, Manual Review Queue, Blacklist/Whitelist, Admin `fraud` module + dashboard, Fraud Audit Log. | 4.1–4.3 (needs real phone/IP/OTP signals as rule inputs). |
| **4.5 — Freeze Audit** | Full live re-verification of all four slices together (mirrors every prior phase's own Freeze Audit), documentation pass (product roadmap, architecture references, Admin settings docs, Customer auth docs — per the Product Owner's own requirement 8). | 4.1–4.4. |

Each slice ships with its own quality gates, live browser verification, and a completion report — the exact discipline this session has used for every milestone so far.

---

## Part 4 — Open Questions for the Product Owner (Genuine Business Decisions, Not Technical Ones)

1. **Existing customers with no phone**: today every real Customer row has an email and a nullable phone. Making phone required breaks any existing row with `phone IS NULL`. Options: (a) backfill is impossible (no real phone data exists to backfill from), so existing email-only accounts stay valid to log in with email until they add a phone (a grace/migration state), or (b) force a one-time phone-collection prompt on next login. Recommend (a) — least disruptive, and this environment's existing seeded/test customers stay usable.
2. **SMS provider**: no real Bangladesh SMS aggregator credentials exist in this environment (no `.env` entry, confirmed absent). Slice 4.2 ships fully functional using `LogSmsProvider` (OTP codes appear in the application log, exactly how this environment already handles "no real credentials configured" for other channels) until real provider credentials are supplied — this is the same category of blocker as every other "external credentials required" pause point this session has already deferred correctly.
3. **Fraud action defaults**: requirement 5 asks for merchant-configurable Block/Warn/Manual-review/Disable per rule — recommend every rule default to **Manual review** (never silently auto-blocking a legitimate order) until a merchant explicitly tightens it, consistent with e-commerce norms and the least-disruptive default.

None of these block starting Slice 4.1, which has no dependency on any of the three answers above.

---

## Part 5 — What This Document Deliberately Does Not Do

No code, no migration, no Admin screen is created by this document — Slice 4.1 begins in a follow-up implementation pass. Per the Product Owner's own instruction to verify against the repository before implementation, this document is that verification.
