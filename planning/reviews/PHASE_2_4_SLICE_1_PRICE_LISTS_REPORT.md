# Phase 2.4 — Pricing Engine, Slice 1: Price Lists & Price Entries

**Status:** ✅ **Approved by the Product Owner (2026-08-13).** Complete, quality-gated, verified live against the real running backend.

---

## 1. Architecture adherence summary

Built strictly against the real, already-complete Pricing backend studied in `planning/architecture/PHASE_2_4_PRICING_ARCHITECTURE.md` and validated in `planning/reviews/PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`. **Nothing new was created**: no endpoint, migration, permission, or business rule. Every field, validation rule, and error shape was read directly from `apps/backend/app/Domains/Commerce/Pricing/` — `PriceListController`, `PriceListEntryController`, their Requests/Resources/Actions — never assumed.

- **`packages/api-client/src/pricing/`** — a new typed REST layer (`priceLists.ts`, `priceListEntries.ts`, `resourceClient.ts`, `types.ts`), mirroring Catalog's and Inventory's own established per-module pattern exactly.
- **No "Restore" action anywhere** — the architecture review's own Task 2 finding (Pricing exposes no restore endpoint for any of its four archivable entities, and the identical "Restore only undoes soft-delete, never un-archives" trap was already found and fixed once for Inventory's Warehouse) was designed around from the start, not retrofitted after shipping a misleading button a second time.
- **Entries live in a drawer, not a new top-level page** — `packages/api-client/src/pricing/priceListEntries.ts`'s own docblock explains why: no standalone list/get endpoint exists for a single entry or a cross-list feed; every entry is only ever read as part of its parent `PriceList` (`GET /price-lists/{id}` → `.entries`). This is the identical shape that put Inventory's own Stock Reservations in a drawer rather than a page in Slice 2 — the same architectural reasoning, applied consistently.
- **Registered via the existing Module Registration Framework** (`apps/admin/src/modules/pricing/module.ts`, one new line in `modules/index.ts`) — zero Admin Shell, Navigation, Authentication, or Design System changes.
- **Tax Zones/Classes/Rates are not represented anywhere in this slice** — out of scope per the brief and the architecture review's own recommendation (Tax remains conditioned on the Product Owner's Tax Class ownership decision).

## 2. Features implemented

- **Price Lists**: full CRUD (create, list, edit, archive, delete), each field mapped exactly to the real `CreatePriceListRequest`/`UpdatePriceListRequest` — `name`, `currencyCode` (3-letter, uppercased on submit, server validates against the real ISO 4217 active-currency list), `isDefault` (shown and sent **only on edit** — the backend never accepts it on create, so the form doesn't pretend it can).
- **Price List Entries**: full CRUD within a list's own detail drawer — SKU, base price, compare-at price (display-only, matches the backend's own "never used in any calculation" fact), sale price + optional start/end schedule, with a live Catalog-SKU-match caption (the same client-side join pattern Inventory already established, since `PriceListEntry.sku` is a plain string, never a Catalog foreign key).
- **Search**: genuine, full-dataset search on both screens — the Price Lists list fetches its *complete* collection once (realistic scale: a merchant has one list per currency/market, not thousands) and searches/sorts/paginates entirely client-side, rather than the partial "Filter this page…" pattern used elsewhere for genuinely large collections; entries within a list are searched the same way, since the backend already returns the complete set in one response.
- **Filters**: Status (active/archived) and Currency, both genuine (not partial-page) since the underlying data is already fully loaded.
- **Sorting**: real, working click-to-sort column headers (Name/Currency/Status/Updated) — the backend has a *hardcoded* `orderBy('name')` with no sort parameter at all, so this is implemented entirely client-side against the complete dataset, which is what makes it honestly functional rather than a fake control.
- **Pagination**: client-side over the complete, already-loaded set (20/page) — the same honesty reasoning as Search/Sort above.
- **Empty states**: first-ever vs. no-matches-for-filter, worded differently, matching the established convention.
- **Loading states**: skeleton rows on the list and the detail drawer.
- **Validation**: client-side (Zod, matching every real server rule — 3-letter currency, positive prices, `sale_price < base_price`, `sale_ends_at` after `sale_starts_at`) backed by full server-error surfacing for everything the client doesn't (or shouldn't) duplicate — duplicate SKU within a list, invalid ISO currency code, the currency-change-blocked-once-priced 409.
- **Error handling**: a new `pricingErrorMessage()` helper (mirrors `catalogErrorMessage()`/`inventoryErrorMessage()`) specifically decodes the currency-change-block message into an actionable sentence, rather than showing the exception's own literal (and here slightly misleading) "cannot be deleted" wording.
- **Success feedback**: toasts for every mutation.
- **Activity integration**: not built this slice — `GET /pricing/audit-logs` exists and works, but building a dedicated Activity screen was explicitly out of this slice's scope per the brief's "Build ONLY" list; "Updated" timestamps (already backed by the real resource) serve as the in-context signal for now.
- **Responsive layouts**: verified live at 390px — the shared `Table` component's own `overflow-x-auto` wrapper (already used platform-wide) handles horizontal scroll correctly; the detail drawer, dialogs, and KPI strip all reflow correctly on mobile.
- **Accessibility**: zero critical/serious `@axe-core` violations on the populated list, the create dialog, and the populated detail drawer — after fixing a real contrast bug found during this pass (§4).

## 3. Screens completed

- **Price Lists** (`/pricing/price-lists`, new top-level route + nav item under a new "Pricing" nav group) — a KPI strip (Price lists / Currencies covered / **Missing a default**, the last one warning-styled and only appearing when a currency has active lists but none marked default — directly answering "which price list is active" and surfacing the exact risk the architecture review flagged: an unset default silently breaks Checkout for that whole currency), then the list itself (Name + Default badge, Currency, Status, Updated, sortable columns, search, Status/Currency filters, row actions).
- **Price List detail** (drawer, opened by row click) — header (name, currency, Default/status badges, "N SKUs priced · Updated …"), an entries table (Product+SKU with live Catalog match, Base price, Compare at, Sale — with "On sale"/"Scheduled"/"Not active" states and the schedule window shown), search, Add price / Edit / Delete actions.
- **Create/Edit Price List** and **Add/Edit Price** dialogs.

## 4. Bugs discovered and fixed

Three real issues found via live testing against the real backend, all fixed:

1. **Critical, backend — a genuine `TypeError` crash, live-reproduced for the first time in this sandbox.** `PriceListEntry::effectivePrice()` declares `: string` but returned `$this->base_price` uncast. `base_price`/`sale_price` have no explicit Eloquent cast (`decimal(14,4)` columns) — MySQL/MariaDB (this platform's real target, ADR-0003) return decimal columns as strings, but this sandbox's SQLite driver returns a native float, crashing every call. Since the backend's own Pest suite requires real MySQL (unavailable here), **this path had never actually executed in this sandbox before this slice's own live verification found it** — not a regression from this build, a pre-existing latent defect this slice was the first real caller to exercise. Fixed with a one-line, minimal cast (`(string) $this->base_price`, matching the identical treatment already applied to the `sale_price` branch one line above) — this makes the method's own already-declared return-type contract actually hold, not a new capability. Live-reproduced before the fix (`GET /price-lists/{id}` 500ing the moment any entry existed), re-verified fixed after (full CRUD round trip now succeeds).
2. **Real, frontend — a Zod schema bug of my own that silently blocked every submission leaving an optional price field blank.** `Number('')` is `0` in JavaScript, not `NaN` — so the first-draft schema's `z.union([z.coerce.number().positive(), z.nan()])` for `compareAtPrice`/`salePrice` never actually recognized an empty input as "left blank": it coerced to `0`, which fails both branches of the union, silently failing validation and blocking the whole form with no visible error. Caught live (adding a price with no sale price simply hung). Fixed by preprocessing the empty/undefined case to `undefined` *before* coercion — the correct pattern for an optional numeric field fed by a plain text input.
3. **Minor, frontend — a real WCAG AA contrast failure, the exact same shape already found and fixed once for Inventory.** I used the Design System's default `Badge` tinted `success`/`info` variants for the Default/Status/On-sale badges — the same 2.85–4.13:1-against-4.5:1 failure Inventory's own Slice 1 UX pass already documented and fixed (`TransferStatusBadge`'s own docblock names it explicitly). I hadn't applied that established fix here. Found by this slice's own `@axe-core` scan; fixed per-usage with the same solid `bg-feedback-* text-black` treatment already used platform-wide — not a Design System change.

A fourth item worth naming honestly, not a "bug" exactly: a real query-invalidation gap where entry create/delete mutations invalidated the wrong React Query cache key (`'list'` instead of `'list-all'`, the key the list page actually reads from) — harmless today since no entry mutation touches any field the list page displays, but fixed for correctness before it could matter.

## 5. Quality gate results

| Gate | Result |
|---|---|
| Typecheck (all workspaces) | ✅ Clean |
| ESLint (all workspaces) | ✅ Clean |
| Production build | ✅ Succeeds — `PriceListsListPage` code-splits into its own 24.95 kB chunk |
| Unit tests | ✅ 171/171 passing (13 new: 9 api-client wrapper tests, 4 `formatCurrency` tests) |
| Playwright — Pricing suite | ✅ 10/10 passing (incl. 1 accessibility scan across the list, create dialog, and populated detail drawer) |
| Playwright — full suite | 59/65 — the same pre-existing, unrelated Catalog flakiness every prior gate in this engagement has confirmed (a *different* one of the same handful of Catalog specs each run, always passes in isolation — parallel-worker resource contention, not a real failure) |
| Accessibility (axe, critical/serious) | ✅ 0 violations, after the contrast fix in §4.3 |
| Responsive | ✅ Verified live at 390px and 1440px |
| Live manual verification | ✅ See below |

## 6. Live verification detail

Ran a 27-check scripted verification against the real `php84 artisan serve` backend, not mocks — every check passing on the final run:

- Created two real USD price lists; confirmed the "Missing a default" KPI correctly appears (both non-default) and correctly clears the moment one is set default.
- Added a plain price, a duplicate-SKU rejection (real 422), a client-blocked over-priced sale, and a real on-sale entry (confirmed the "On sale" badge and effective-price resolution).
- Confirmed the real 409 when attempting to change a list's currency once it has priced entries, with the exact server reason surfaced.
- Confirmed an archived list offers no Restore or Archive action.
- Confirmed Status filtering, entry search, list search, and sortable columns all work against the live data.
- Deleted a priced entry, then deleted the whole list — confirmed the cascade (list + every entry) and its disappearance from the list.
- All QA data hard-deleted afterward — the environment is back to its pre-verification state.

## 7. Remaining work before Slice 2

Not started, no work will begin without separate Product Owner direction:

- **Tax Zones/Classes/Rates** — explicitly out of scope this slice, conditioned on the architecture review's own Tax Class ownership decision (`planning/reviews/PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`).
- **A dedicated Activity/Audit screen** — `GET /pricing/audit-logs` is real and ready; not built this slice per the brief's own scope list.
- **Customer Group/Wholesale/Channel Pricing, Cost Price/Margin, Promotions/Coupons, Dynamic/AI Pricing** — confirmed not supported by the backend at all (per the architecture doc's own `Supported`/`Missing` breakdown); none built here, matching the brief's explicit "Do NOT build" list.
- **A real Product↔Tax-Class link** — the architecture review's own flagged gap; still open, still a Product Owner decision, not touched by this slice.
- **The same 5–6 pre-existing, unrelated Catalog Playwright flakes** — flagged, not fixed, in every gate run since Slice 2 of Inventory.

## 8. Desktop screenshots

Captured (1440×900, real backend) and delivered to the Product Owner alongside this report:
- `desktop-01-empty.png` — first-ever empty state
- `desktop-04-list-one-item.png` — one list created
- `desktop-05-kpi-missing-default.png` — the "Missing a default" warning KPI
- `desktop-06-list-with-default.png` — after fixing the default (contrast-fixed solid badges)
- `desktop-08-add-price-dialog.png` — Add price dialog
- `desktop-09-detail-drawer-one-entry.png` — detail drawer with one priced SKU
- `desktop-11-detail-drawer-with-sale.png` — detail drawer with an active-sale entry
- `desktop-13-currency-change-blocked.png` — the real 409 surfaced inline
- `desktop-14-status-filter-archived.png` — Status filter in action

## 9. Mobile screenshots

Captured (390×844, real backend) and delivered to the Product Owner alongside this report:
- `mobile-01-list.png` — Price Lists list, KPI strip reflowed to 2-column
- `mobile-02-create-dialog.png` — New price list dialog
- `mobile-03-detail-drawer.png` — detail drawer, fully loaded

## Product Owner review checklist

- [x] "Which price list is active / which currency / when updated" all answerable at a glance from the list, without opening a row
- [x] The "Missing a default" KPI — a genuinely high-stakes, easy-to-miss risk (a currency with lists but no default silently breaks Checkout for it) — surfaced prominently enough
- [x] No Tax, Customer Group/Wholesale/Channel Pricing, Cost Price/Margin, Promotions, or AI Pricing concept was introduced anywhere
- [x] New "Pricing" nav group/route is acceptable, added via the existing Module Registration Framework, not a Navigation-system change
- [x] No "Restore" action for an archived Price List — the deliberate, architecture-review-approved choice, not an oversight
- [x] Visual/interaction consistency with Catalog and Inventory holds up (badges, dialogs, empty/loading/error states, drawer pattern, KPI strip)
- [x] OK with the three bugs found/fixed as described in §4, including the backend one-line fix (§4.1)
- [x] Aware of and OK deferring Tax, Activity, and the Catalog flakiness, per §7

**Approved by the Product Owner on 2026-08-13.** Committed and pushed per that approval — Slice 2 (Tax) has not begun, awaiting separate Product Owner direction.
