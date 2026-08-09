# Phase 2.2A — Product Editor Experience Redesign (UX First)

| Field | Value |
|---|---|
| **Date** | 2026-08-10 |
| **Scope** | `apps/admin/src/modules/catalog/products/ProductFormPage.tsx` and its new `editor/` sub-components only. No new Catalog features, Variants, Media Manager, Inventory, Pricing, Orders, or Storefront work. No backend/API/DB changes. No Admin Shell, Sidebar, Theme, Design System, Module Registration Framework, or Permission system changes (one narrow, additive exception — see §6). |
| **Status** | Complete. Awaiting Product Owner review before any further Catalog work. |

---

## 1. Research — why these products feel productive (not layout-copying)

Studied for mechanism, not appearance, before writing any code.

**Shopify Admin.** Main content (title, description, media, variants — long-form, frequently-changing) sits in a wide left column; short, glanceable status/meta fields (status, sales channels, organization) sit in a narrow right rail. That split mirrors how a merchant actually thinks — "what is this product" vs. "where does it live / what state is it in" — not how the database is normalized. Save is sticky, top-right, never scrolls away. Status is a first-class object: a badge *plus* the controls that change it, co-located.

**BigCommerce.** Tabs across the top give a merchant a mental map of "how much is left" — at the cost of full-page reloads between tabs. We wanted that mental map without the reload cost: an anchored single-scroll page with a clear section list, not tabs.

**Adobe Commerce / Magento.** Extremely dense, accordion-heavy — the canonical "feels like a database form" the brief explicitly warned against. Density without hierarchy reads as clutter; this redesign leans on density *within* a clear hierarchy instead.

**WooCommerce.** Literally a WordPress post-editor skin — proof that reusing generic CMS chrome for a commerce-specific tool is exactly the failure mode to avoid.

**Saleor / Medusa (headless-first admin panels).** Both make an explicit point of separating "what the API can do today" from "what the UI shows" — unbuilt capabilities are either absent or clearly marked as not-yet-available, never faked with dead inputs. This directly reinforces this project's own [headless-first decision](../../docs/decisions/2026-08-09-catalog-headless-first-principle.md) and its established "no fake placeholder UI" precedent. Medusa's admin places an "Organize" panel (status, sales channel, collections) in almost the same position as Shopify's — two independently-built modern commerce admins converging on the same pattern is a real signal, not a coincidence to copy.

**Linear.** Keyboard is the primary interface, not a nice-to-have — every action has a shortcut, shown inline on the control itself, not hidden in docs. Small state changes are silent until they matter; nothing interrupts with a modal unless a decision is actually needed.

**Stripe Dashboard.** Inline, field-adjacent validation — an error appears directly under the field the instant it's knowable, never a summary list disconnected from the fields. Restraint: one high-emphasis button visible at a time, generous whitespace.

**Notion.** Typographic hierarchy carries structure, not boxes — a property panel groups related facts under a quiet label rather than a heavy bordered card when the fields are simple key-values. Placeholders explain what a good answer looks like, not just prompt for one.

**Synthesized into six concrete decisions**, each applied below: (1) two-column layout — wide main content, narrow glanceable sidebar; (2) sticky action bar, not a bottom-of-form button; (3) one primary action visible at a time; (4) inline, field-adjacent validation, extended with a completion checklist mirroring the *real* backend rule; (5) visible keyboard affordances (⌘S printed on the Save button itself); (6) honest, non-fake placeholders for unbuilt sections, plus reserved-but-disabled AI affordances exactly where the real feature will act later.

---

## 2. What changed

### Information architecture
Reorganized around the merchant's mental model, not the database:

- **Main column** (wide — content a merchant edits often): **Identity** → **Media** → **Pricing** → **Inventory** → **Description** → **SEO** → **Advanced**.
- **Sidebar** (narrow — glanceable, changed rarely): **Status & Visibility** (with a live completion checklist) → **Organization**.

Media, Pricing, Inventory, and Organization are real, honest `EmptyState` cards — not fake inputs — since none of those backends exist yet. Each names exactly what's missing and why, matching this project's own Dashboard/Settings precedent from Phase 2.1.

### Sticky action bar (`editor/StickyActionBar.tsx`)
Replaces the old `PageHeader` for this one page. Always-reachable: back/cancel, title (real `<h1>`), status badge, an "Unsaved changes" pill when dirty, a disabled **Preview** button (tooltipped — reserved for when a Storefront exists), an overflow menu (**Duplicate** / **Archive** or **Restore** / **Delete**) for an existing product, a contextual **Publish** button (only shown for a draft), and **Save**, with its keyboard shortcut printed directly on the button (`⌘S` / `Ctrl+S`).

### Productivity features actually shipped
- **Unsaved-changes indicator** — a visible badge plus a `beforeunload` guard on real tab close/refresh, and a discard-confirmation dialog on in-app Cancel.
- **Slug preview** — a live, client-side preview of what the slug will likely be, with a one-click "Use this" to accept it. The real value is still generated server-side when left blank — this is a preview, never a silent behavior change.
- **Completion checklist** — mirrors the *real* backend publish rule (name, SKU, ≥1 category, and ≥1 variant for configurable products) exactly, including marking category/variant assignment as "not yet available" rather than a failable checkbox, since neither is buildable in this UI yet.
- **Duplicate** — a purely client-side prefill (router state) into a fresh `/new` form, with SKU and slug cleared. No new backend endpoint; it still goes through the real `createProduct` call on save.
- **Ctrl/Cmd+S save** — wired to the same submit path as the button.
- **Reserved AI locations** — five disabled, tooltipped ✨ buttons (Improve Title, Generate Description, Marketing Copy, Translate, Generate SEO) positioned exactly where each real feature will act. No AI was implemented, per the brief.

---

## 3. Before / after

| | |
|---|---|
| **Before** | Single stacked column, a plain `PageHeader`, Save only reachable at the very bottom of the form, no status/completion signal, no reserved future affordances. |
| **After** | Two-column, research-informed layout; sticky, always-reachable action bar; live completion checklist; honest placeholders for the four unbuilt sections; reserved AI locations; fully responsive. |

Screenshots (desktop/tablet/mobile, before and after) were captured live against the real running app and sent directly in this conversation; the after-desktop and after-edit-mode captures are also referenced here for anyone reviewing this file in the repo. (Not committed as binary assets — this report describes and links to them; the live captures are the authoritative record.)

---

## 4. Real bugs found and fixed

All four found via actually running the app against the real backend — not assumed correct, not caught by the mocked Playwright suite alone.

1. **Publish-not-ready reason was silently swallowed.** The real backend's `422` for "not ready to publish" has **no `details` key at all** — just a single combined sentence in `message` (e.g. *"...it is not assigned to at least one category."*). The pre-existing code (from Phase 2.2 Slice 1, unrelated to this redesign but only now exercised against a live backend) only checked for a `details.reasons: string[]` array that doesn't exist in the real response, so it silently fell through to a generic "Could not publish this product" message — never showing the merchant *why*. Fixed with a fallback to `[error.message]`, and the earlier (wrong) assumption corrected in both `packages/api-client`'s docblocks and the Playwright mock that had been asserting the fictional shape.
2. **Missing `<h1>`.** Replacing `PageHeader` (which renders a real `<h1>`) with the new sticky bar dropped the page down to zero headings — a real semantic regression `@axe-core`'s default ruleset didn't flag, caught by manual review. Fixed by rendering the sticky bar's title as `Text as="h1"`.
3. **React ref-forwarding warning on Delete.** Nesting the shared `ConfirmDialog`'s trigger inside a `DropdownMenuItem` (needed for "Delete" inside the overflow menu) threw *"Function components cannot be given refs"* — `packages/ui`'s `DropdownMenuItem` isn't `forwardRef`-wrapped, and Radix's `asChild` composition needs to attach one. Since this phase's hard rules forbid touching the Design System, fixed entirely in this page's own code instead: a plain controlled `Dialog`, opened from the menu item's `onSelect`, rather than composed as its child.
4. **Mobile overflow on card headers with multiple action buttons.** The Description card's three AI-reserve buttons overflowed past the viewport edge at 390px width — caught in the first "after" mobile screenshot, not assumed fine. Fixed by making card headers `flex-col` below `sm` (stacking title above a wrapping button row) instead of forcing one row.

---

## 5. Quality gates

| Gate | Result |
|---|---|
| `npm run typecheck` (whole repo) | ✅ clean |
| `npm run lint` (whole repo) | ✅ clean |
| Unit tests | ✅ 77 passing (35 admin + 26 api-client + 16 ui — includes 6 new tests for the `slugify` helper) |
| `npm run build` | ✅ clean, no chunk-size warnings (`ProductFormPage` chunk: 21.5 kB / 6.9 kB gzip) |
| Playwright e2e | ✅ 25 passing (7 in `catalog-products.spec.ts`, 6 new: unsaved-changes+discard, slug preview, Ctrl+S save, Duplicate, Delete-via-overflow-menu with a regression assertion for bug #3 above, plus the existing publish-retry and a11y tests, both updated to match the real backend response shape) |
| Accessibility (`@axe-core/playwright`) | ✅ 0 critical/serious violations on the Product form |
| Responsive | ✅ verified live at 1440/834/390px after the mobile-overflow fix above |
| Keyboard navigation | ✅ verified live — every control in the new content is a visible, named, reachable tab stop; full logical loop with no dead ends; Ctrl/Cmd+S confirmed equivalent to the Save button click |
| Manual UX walkthrough | ✅ performed against the real running backend (not mocks) — create → save → publish-not-ready → duplicate → delete, end to end |

---

## 6. Hard-rules compliance

- **No backend/API/DB changes.** Confirmed — the only non-`apps/admin` files touched are two `packages/api-client` docblock/type corrections (documentation of what the *existing* endpoint actually returns, not a contract change) and this report.
- **No Admin Shell / Sidebar / Navigation / Theme / Module Registration / Permission system changes.** Confirmed — nothing outside `apps/admin/src/modules/catalog/products/` was modified except those two api-client files.
- **Design System**: one narrow exception considered and *not* taken — `packages/ui`'s `DropdownMenuItem` genuinely isn't `forwardRef`-wrapped (bug #3 above), but rather than fix it there (which the hard rules forbid this phase), the fix was kept entirely inside this page's own code. Flagging it here for a future, separate, Design-System-scoped pass: `DropdownMenuItem` should be wrapped in `React.forwardRef` — a small, additive, backward-compatible fix — since any future page composing a Dialog/Popover trigger inside a dropdown menu item will hit the same warning.
- **No invented backend fields.** Confirmed — Pricing/Inventory/Organization/Media remain honest empty states; the completion checklist mirrors the real `PublishProductAction` rule exactly (verified against the live backend, not assumed).

## 7. Remaining follow-up (not done in this pass, named rather than silently skipped)

- `packages/ui`'s `DropdownMenuItem` should be wrapped in `forwardRef` in a future Design-System-scoped change (see §6).
- Before/after screenshots exist only as live conversation attachments and local capture files in this session — not committed as binary assets to the repo (kept the commit diff to source only).
