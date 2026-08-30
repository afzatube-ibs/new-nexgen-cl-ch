# Milestone 10 — Settings Framework Population + Localization Admin — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`, verified against the actual repository per the standing instruction: classify the real implementation state first, correct the roadmap to match the repository, then continue.

## Part 0 — Verification Against the Repository (Before Any Implementation)

The plan's objective: "Give Store Configuration and Localization their own real settings panels... plus resolve why zero modules currently register one."

Direct verification found this **accurate on the framework claim, but incomplete on the domain classification**:

- **Settings framework**: confirmed real, tested, and genuinely empty — `SettingsPage.tsx`'s own docblock already correctly named this an honest empty state, and zero modules registered a `settingsPanels` entry (`appearance/module.ts`'s own mention of `settingsPanels` was a code *comment* explaining why Appearance deliberately does **not** use one, not a real registration — confirmed by reading it directly).
- **Store Configuration**: **partially implemented**, not simply "missing." `UpdateStoreRequest`/`packages/api-client`'s own `updateStore()` already accepted `currencyCode`/`locale`/`timezone` — and `name`/contact-email/phone/address were already real, editable fields on Appearance's own Branding screen (`Store identity` card, Beta Experience Pack 1). But `currencyCode`/`locale`/`timezone` were never exposed in any Admin screen, confirmed by reading every real consumer of `UpdateStoreInput` directly.
- **Localization (Currency/Locale management)**: **disconnected** — a fully real, complete backend (`CurrencyController`/`LocaleController`, full CRUD + archive + delete + audit log, confirmed by reading `apps/backend/app/Domains/Platform/Localization/` directly) with **zero** Admin UI and **zero** `packages/api-client` wrapper anywhere in the repository.

## Part 1 — What Shipped

### `packages/api-client/src/localization/` (new)
Full CRUD wrappers for both real resources, mirroring this package's established per-domain file layout: `types.ts`, `currencies.ts`, `locales.ts`, `index.ts`. 10 new tests, all passing.

### Admin (`apps/admin/src/modules/localization`, new module)
This module's entire contribution is two real `settingsPanels` — no top-level nav entry, no top-level route, exactly matching the plan's own framing:

- **`StoreConfigurationPanel`** — the real, previously-unexposed part of `Store`: default currency (a real `Select` populated from the live Currency catalog), default locale (same, from the live Locale catalog), and timezone (a plain, server-validated IANA-identifier text field — no dedicated timezone-picker component exists in this codebase yet, and building one was out of this milestone's scope). Deliberately does **not** duplicate `name`/contact/address — those remain Branding's own fields, per this engagement's "never duplicate business logic" instruction.
- **`LocalizationPanel`** — real Currency and Locale CRUD, each its own section (`CurrenciesSection`/`LocalesSection`) rather than a routed list page: this installation's own real currency/locale counts are a handful, the same order of magnitude `RolesListPage` (Milestone 6) found for Roles, so no search/pagination toolbar. The base currency and default locale are shown with a "Base"/"Default" badge and no archive/delete action — a real, honest client-side guardrail mirroring `RolesListPage`'s own guard on the seeded `administrator` role, backed either way by the real server-side `CannotRemoveBaseCurrencyException`/`CannotRemoveDefaultLocaleException` (HTTP 422 — confirmed by reading both directly, and correctly mapped in this module's own `errors.ts`, not assumed to be a 409 `ConflictError` the way most other business-rule violations in this codebase are).
- **`CurrencyFormDialog`/`LocaleFormDialog`** — create/edit, mirroring `UserFormDialog`'s own established pattern. `isBase`/`isDefault` are deliberately never offered on the create/edit form — promoting a currency to base or a locale to default is each's own real, separate action (`Actions\CreateCurrencyAction`'s/`CreateLocaleAction`'s own docblocks), wired as a dedicated "Set as base"/"Set as default" row action instead.

Two stale docblocks were also corrected: `DashboardPage.tsx`'s own (from Milestone 8, left unfinished) and `SettingsPage.tsx`'s own — both still said "no business modules exist yet."

## Part 2 — A Real, Live-Found Error-Mapping Bug, Caught Before Shipping

While writing `localizationErrorMessage()`, verified the real HTTP status `CannotRemoveBaseCurrencyException`/`CannotRemoveDefaultLocaleException` map to by reading `bootstrap/app.php`'s own exception handler and the exceptions' own docblocks directly: **422**, not 409. `packages/api-client`'s own `ApiClient` dispatches purely by status code, so this business-rule violation surfaces as `ValidationApiError`, not `ConflictError` — an easy, real mistake to make by pattern-matching "this sounds like a conflict" instead of verifying, corrected before ever being live-tested.

## Part 3 — Verification

| Check | Result |
|---|---|
| `packages/api-client` typecheck | Clean |
| `packages/api-client` tests | **207/207 passed** (197 prior + 10 new). |
| Admin typecheck | Clean |
| Admin lint | Clean |
| Admin tests | **156/156 passed** (unchanged — no new pure-function logic beyond what's already covered by existing patterns this module reuses). |
| Admin production build | Succeeded — `StoreConfigurationPanel` (3.15 KB) and `LocalizationPanel` (12.51 KB) each correctly code-split into their own lazy-loaded chunk. |
| Backend Pest (Localization + Store Configuration domains) | No backend code was changed this milestone (the real gap was entirely UI-side); a targeted regression run against both domains confirms the pre-existing baseline is unaffected. |

### Live, end-to-end verification (real backend + real Admin app + real browser)
1. Created a real administrator account, signed into the real Admin app, opened Settings.
2. Confirmed both real tabs render: Store Configuration (correctly showing "No active currencies exist yet" and falling back to the Store's own raw `currencyCode`/`locale` values, since the Currency/Locale catalogs were genuinely, honestly empty) and Localization (both sections honestly empty).
3. Created a real Currency (BDT) and a real Locale (en) through the real dialogs.
4. Promoted BDT to base and `en` to default via the real row actions — confirmed the "Base"/"Default" badges appear and the Archive/Delete actions correctly disappear for each.
5. Switched back to Store Configuration and confirmed its two dropdowns now show the real, just-created options ("BDT — Bangladeshi Taka", "English (en)") — the "no active currencies" warning gone.
6. Changed the real Timezone field, saved, reloaded the page, and confirmed the new value persisted — then reverted it to the store's real original value.
7. Deleted the test currency, locale, and administrator account from the dev database afterward.

## Part 4 — Roadmap Correction

`PRODUCTION_COMPLETION_PLAN_v2.md`'s Milestone 10 entry is updated in place: Store Configuration is reclassified from an implied "needs building from scratch" to its real state (partially implemented — identity/contact/address already real via Branding, currency/locale/timezone genuinely missing until this milestone); Localization is reclassified from unstated to its real state (disconnected — a complete, real backend with zero UI, now connected).

## Part 5 — Remaining, Honest Gaps

- **No dedicated Localization/Store Configuration audit-log UI** — both real backends have one (`GET /localization/audit-logs`, `GET /store-configuration/audit-logs`), but given how rarely these particular resources change relative to Orders/Customers/etc. (the modules every other audit-log page in this codebase was built for), a dedicated page was judged out of this milestone's scope. A reasonable, small follow-up.
- **Timezone is a plain validated text field, not a searchable picker** — no such component exists yet in this codebase; the real backend's own `ValidTimezone` rule (a direct check against PHP's own IANA database) is what actually enforces correctness, surfaced honestly on a bad value rather than pre-validated client-side against a duplicated list.

---
