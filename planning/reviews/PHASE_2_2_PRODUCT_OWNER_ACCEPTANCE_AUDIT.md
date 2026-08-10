# Phase 2.2 — Catalog Engine: Product Owner Acceptance Audit

| Field | Value |
|---|---|
| **Date** | 2026-08-11 |
| **Scope** | Everything shipped under Phase 2.2 so far: Slice 1 (Commerce Foundation), Phase 2.2A (Product Editor UX redesign), Slice 2 (Advanced Product Engine — Variants/Media/Organization/Activity) |
| **Type** | Product Owner acceptance review, **not** a new phase. Explicitly does not begin Inventory, Pricing, or any other phase. |
| **Method** | Live testing against the real running `apps/backend` (SQLite, local dev) and the real running `apps/admin` dev server — not mocks. Every finding below was reproduced live before being called a bug, and every fix was re-verified live afterward. Also read the relevant backend source (Actions, FormRequests, migrations) to find root causes, not just symptoms. |
| **Outcome** | 5 real, verified issues found. All 5 fixed and re-verified live. Full details below. |

This audit does **not** consider Catalog frozen or approved — that determination belongs to the Product Owner. This document reports what was found, what was fixed, what remains open, and a recommendation only.

---

## 1. Method

1. Logged into the live Admin UI as the dev administrator against the real backend (both already running from a prior session in this environment).
2. Walked the full merchant workflow a real store owner would follow on day one: create a category, create a product, assign it, publish it, add media, switch it to a configurable product, generate variants, delete and regenerate a variant, and exercise bulk actions across every taxonomy entity.
3. For every destructive action (Delete, bulk Delete), tested what actually happens — not just that the confirmation dialog text is correct, but what the backend does with the data afterward.
4. Read backend source for every Action touched by a live-observed anomaly, to fix the actual root cause rather than paper over the symptom.
5. Re-ran the exact failing scenario after each fix, live, before considering it closed.
6. Ran `typecheck`, `lint`, `build`, and the relevant unit test suites for every package touched.

---

## 2. Findings and fixes

### 2.1 — CRITICAL: Bulk "Delete" fired immediately with zero confirmation, platform-wide

**Severity:** Blocker. **Status:** Fixed and verified live.

Every one of the eight Catalog list pages (Products, Brands, Categories, Collections, Tags, Attributes, Attribute Groups, Options) wired its bulk-actions "Delete" button directly to the delete operation:

```ts
{ label: 'Delete', variant: 'destructive', onClick: () => runBulk('delete') }
```

Selecting any number of rows and clicking "Delete" once **permanently deleted every selected row immediately**, with no confirmation step of any kind — unlike every row-level Delete action, which already went through `ConfirmDialog`. A merchant selecting 50 products and misclicking "Delete" instead of "Archive" (both live in the same toolbar, one click apart) would lose all 50 permanently, with no undo. This is exactly the class of issue an acceptance review exists to catch before Beta.

**Fix:** `BulkActionsBar` ([apps/admin/src/framework/BulkActionsBar.tsx](apps/admin/src/framework/BulkActionsBar.tsx)) now accepts an optional `confirm: { title, description, confirmLabel? }` on any `BulkAction`. When present, the action renders through the existing `ConfirmDialog` component instead of firing on click — the same confirmation mechanism every row-level Delete already used, just wired one level up. All eight list pages' bulk "Delete" actions were updated to pass accurate, entity-specific warning copy (see 2.2 below for why the copy differs per entity). Bulk Archive/Restore/Publish were deliberately left unconfirmed, matching the existing precedent that only irreversible actions get a confirmation gate.

**Verified live:** selecting a category and clicking bulk Delete now opens "Delete 1 selected category?" with accurate consequence copy; confirming still deletes correctly; cancelling correctly aborts with no request sent.

### 2.2 — Deleting a Category/Brand/Collection/Tag gives no warning it's in use, and silently strips a live product's data

**Severity:** Major (data-integrity/merchant-workflow). **Status:** Confirm-dialog copy fixed; underlying backend cascade behavior investigated and left as-is (see reasoning below).

Reproduced live: created a category, assigned it to a published product (satisfying that product's own "at least one category" publish rule), then deleted the category. The delete succeeded with a generic "will be permanently deleted" dialog — no mention that a live, published product depended on it. Afterward, the product was still shown as `active` (published) but its own "Ready to publish?" checklist now failed the "at least one category" check it was published under, because the category assignment had been silently stripped.

Reading the backend confirmed this is **existing, deliberate design**, not a new regression: `DeleteCategoryAction`/`DeleteCollectionAction`/`DeleteTagAction`/`DeleteBrandAction` all explicitly detach the record from every product before deleting (the code comments cite consistency with Identity & Access's own `DeleteRoleAction`). This is a real backend architectural decision predating this audit, applied consistently across four entities — not a bug to unilaterally reverse mid-audit. Changing delete-cascade semantics is a bigger, backend-wide call than this review's mandate covers.

**Fix applied:** the Admin UI's confirmation copy for these four entities' delete actions (both row-level and the new bulk-delete confirmation from 2.1) now honestly states the real consequence, e.g. for Category: *"Any products assigned to these categories will lose that categorization — if a product depended on it to meet the 'at least one category' publish requirement, it will no longer satisfy it."* This doesn't change backend behavior — it makes the Admin UI honest about what the backend will actually do, exactly matching this project's own "surface the server's own behavior, don't re-implement or hide it" principle.

**Left open, flagged for the Product Owner:** whether Catalog should *block* deleting a category/brand/collection/tag that's still assigned to any product (forcing an unassign-first workflow, the way `DeleteCategoryAction` already blocks deleting a category with child categories) is a real product decision, not an engineering one. Recommend a explicit decision before Beta launch, not a silent default.

### 2.3 — Product Editor's Variant "Generate all" only created one variant per click, with the rest silently discarded

**Severity:** Critical (functional bug, high-visibility feature). **Status:** Fixed and verified live.

Reproduced live: on a configurable product with one option ("Color") carrying two values (Red, Blue), clicking "Generate all" (which should create both variants in one click, per its own label and its own code's stated intent) only created one. The banner then still showed "1 possible variant not created yet," requiring a second click.

Root cause (found by adding temporary instrumentation, reproducing, then removing it): `VariantsCard.tsx`'s `handleGenerateAll()` looped over every missing option-combination with a bare `await`, no error handling. The *first* combination in the batch was failing server-side — see 2.4 below for why — and since nothing caught that rejection, the `for` loop aborted immediately, silently, with every combination after the failed one never even attempted. Nothing was ever shown to the merchant explaining why "Generate all" hadn't generated all.

**Fix:** `handleGenerateAll()` now continues through every combination even when one fails, collects every failure, and renders a clear summary (e.g. *"1 of the selected variants could not be created: Blue: This was changed elsewhere…"*) instead of failing silently. See [apps/admin/src/modules/catalog/products/editor/variants/VariantsCard.tsx](apps/admin/src/modules/catalog/products/editor/variants/VariantsCard.tsx).

### 2.4 — Deleting a Product or Product Variant permanently blocks its SKU from ever being reused (raw 500, not a clean error)

**Severity:** Critical (data-integrity/production blocker). **Status:** Fixed at the root and verified live, including the exact original repro.

This is the real cause behind 2.3. `Product` and `ProductVariant` both use Laravel `SoftDeletes` — a "deleted" row never physically disappears. Their SKU-uniqueness validation (`CreateProductRequest`, `UpdateProductRequest`, `AddProductVariantRequest`, `UpdateProductVariantRequest`) checked *every* row including soft-deleted ones, so once a SKU was ever used and then deleted, it could never be reused — a routine, expected merchant action (delete a mistaken listing, or delete-then-regenerate a variant via the Matrix) would fail with a confusing "sku has already been taken" error forever after, with the offending row invisible anywhere in the UI.

Fixing only the validation layer (excluding soft-deleted rows from the uniqueness check — the correct fix in isolation) surfaced a second, worse problem live: the request then passed validation and reached the database, where the *physical* unique index on `(tenant_id, sku)` has no way to exclude soft-deleted rows either (no partial/filtered index support on this platform's chosen engine, per ADR-0003) — producing a raw, unhandled `UniqueConstraintViolationException` (HTTP 500) instead of a clean error. That's a regression this audit would not have shipped.

**Fix, both layers:**
- `CreateProductRequest`, `UpdateProductRequest`, `AddProductVariantRequest`, `UpdateProductVariantRequest` — SKU uniqueness now excludes soft-deleted rows (`Rule::unique(...)->whereNull('deleted_at')`), so a genuinely-available SKU validates cleanly.
- `DeleteProductAction`, `DeleteProductVariantAction` — the SKU is salted (`{original}--deleted-{id}`) *before* the soft-delete, freeing the real value for reuse at the database level too. The pre-mutation `sku` is still captured for the audit log's `before` snapshot, so the audit trail keeps the real historical value. This required an explicit `->save()` before `->delete()` — Eloquent's `SoftDeletes::delete()` issues a targeted UPDATE of only the `deleted_at` column via a fresh query, not a general dirty-attribute save, so setting `sku` and calling `delete()` alone silently discards the rename (found live, not assumed — the first version of this fix looked correct in code review but didn't actually persist).

**Verified live, full round-trip:** created a configurable product's two variants via "Generate all" (both succeeded in one click, confirming the 2.3 fix), deleted one, then generated it again via the same "Generate all" flow — succeeded with no error, no server log entry, matching how a merchant would actually encounter this in the Variant Matrix/Generator. Two now-orphaned soft-deleted test rows created during the *first* (pre-fix) reproduction were purged directly (`forceDelete`) since they were this audit's own disposable test data, not real records.

### 2.5 — Stale React ref warning on every taxonomy list page's row-level Delete

**Severity:** Minor (console hygiene / correctness), but real and reproducible. **Status:** Fixed at the root.

`packages/ui`'s `DropdownMenuItem` was a plain function component, not `forwardRef`-wrapped. Phase 2.2A's own completion report had already found and worked around this exact issue for the Product Editor's overflow-menu Delete action — but only at that one call site (page-local controlled state, since touching the Design System was explicitly off-limits that phase) — and explicitly flagged the real fix as deferred, Design-System-scoped follow-up work. This audit found the identical `"Function components cannot be given refs"` warning reproduces on **every** taxonomy list page's row-level Delete (`ConfirmDialog` wrapping a `DropdownMenuItem` trigger — the shared framework's own standard pattern for exactly this), confirmed via a clean browser tab with no prior console history.

**Fix:** `DropdownMenuItem` ([packages/ui/src/components/DropdownMenu/DropdownMenu.tsx](packages/ui/src/components/DropdownMenu/DropdownMenu.tsx)) is now `forwardRef`-wrapped, resolving it at the source for every current and future caller instead of patching each call site. Verified live in a fresh tab: the warning no longer fires when opening a row's Delete confirmation.

---

## 3. Also observed, not changed

- **"No store configured"** in the header throughout this audit — this is Phase 2.1's Workspace Switcher correctly reflecting that no `Store` record exists in this dev database. Catalog doesn't depend on a Store; not a Catalog defect.
- **Option "Code" has no auto-derivation or upfront hint**, unlike Category/Brand/Collection/Tag's slug (which auto-generates from Name and says so). Submitting without one shows a late "Code is required" error rather than a helpful hint. Minor forms-consistency gap, not fixed in this pass — low severity, doesn't block a workflow, just a small rough edge worth a future small fix.
- **The dev environment's single-threaded `php artisan serve`** makes the Product Editor's ~7 parallel data requests queue and complete sequentially (observed 6–10 second full loads). This is a local dev-server characteristic (`php artisan serve` is single-worker by design), not a Catalog code issue — production deployments use php-fpm/queue workers, not this command.
- **Whether Category/Brand/Collection/Tag deletion should block when in-use** (§2.2) is flagged above as an open product decision, not resolved here.

---

## 4. Quality gates

| Gate | Result |
|---|---|
| `npm run typecheck` (`apps/admin`) | ✅ Clean |
| `npm run lint` (`apps/admin`) | ✅ Clean |
| `npm run typecheck` (`packages/ui`) | ✅ Clean |
| `npm run lint` (`packages/ui`) | ✅ Clean |
| `npm run test` (`apps/admin`) | ✅ 53/53 passing |
| `npm run test` (`packages/ui`) | ✅ 16/16 passing |
| `npm run build` (`packages/ui` + `apps/admin`) | ✅ Clean production build |
| `php -l` on all 6 modified backend files | ✅ No syntax errors |
| Live re-verification of every fix against the real running backend | ✅ All 5 findings re-tested and confirmed fixed |
| Backend Pest suite (`--filter=Catalog`) | **Could not run in this environment.** `phpunit.xml` requires a real MySQL server (`DB_CONNECTION=mysql`, database `nexgen_testing`) — this sandbox has none provisioned (port 3306 closed, no `mysql` process), consistent with this environment's already-documented SQLite-only local-dev deviation from ADR-0003. Not a new gap this audit introduced; the backend test suite has never been runnable in this specific sandbox. |
| Playwright e2e suite | **Not re-run in this pass.** Existing specs were checked and none currently exercise the bulk-Delete code path this audit changed, so no known regression risk — but this should be run before the next commit is pushed, as standing practice. |

**Backend Pest note:** since the automated suite genuinely cannot run here, every fix in this report was instead verified the only way actually possible in this environment: direct, live HTTP/browser testing against the real backend and real (SQLite) database — including the exact failure and recovery sequence for §2.3/§2.4, reproduced twice (once failing, once fixed). The suite's own pass/fail result should be confirmed in an environment with real MySQL before this work is pushed to `origin/main` — recommended, not optional, given four of these six file changes are backend validation/deletion logic.

---

## 5. Files changed

**Frontend** (`apps/admin`, `packages/ui`):
- `apps/admin/src/framework/BulkActionsBar.tsx` — optional per-action confirmation
- `apps/admin/src/modules/catalog/{brands,categories,collections,tags,attributes,attributeGroups,options,products}/*ListPage.tsx` — bulk-delete confirmation copy (8 files)
- `apps/admin/src/modules/catalog/products/editor/variants/VariantsCard.tsx` — resilient `handleGenerateAll`, visible per-combo failure reporting
- `packages/ui/src/components/DropdownMenu/DropdownMenu.tsx` — `DropdownMenuItem` now `forwardRef`

**Backend** (`apps/backend`):
- `app/Domains/Commerce/Catalog/Http/Requests/{CreateProductRequest,UpdateProductRequest,AddProductVariantRequest,UpdateProductVariantRequest}.php` — SKU uniqueness excludes soft-deleted rows
- `app/Domains/Commerce/Catalog/Actions/{DeleteProductAction,DeleteProductVariantAction}.php` — SKU salted on delete so the physical unique index doesn't block reuse

No `packages/api-client` or backend route/contract changes — every fix is either a UI-only change or a backend correctness fix within the existing contract (no new fields, no new endpoints).

---

## 6. Verdict

Five real, reproducible issues were found by actually using the product the way a merchant would, not by reading code or trusting the existing (green) automated suite alone. All five are fixed and independently re-verified live, including the two that were serious enough to qualify as production blockers (§2.1 unconfirmed bulk-delete, §2.4 the SKU-reuse 500).

This is not a Product Owner sign-off — that determination is explicitly reserved. Two items are surfaced above for an explicit product decision rather than an engineering one: whether taxonomy deletion should block when in-use (§2.2), and confirming the Pest suite's final result once it completes (§4).

Catalog remains **not frozen** pending your review of this report.
