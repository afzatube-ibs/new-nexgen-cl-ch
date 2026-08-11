# Phase 2.3 — Inventory Engine, Slice 1 — Product Owner UX Refinement Pass

| | |
|---|---|
| **Status** | 🟡 Refined, quality-gated, verified live — **awaiting Product Owner review**. Not committed. Not pushed. |
| **Date** | 2026-08-12 |
| **Scope** | UX/UI refinement of the already-built Slice 1 screens only — no new features, no backend changes |
| **Explicitly not touched** | Backend, API contracts, database, permissions, routes, Admin Shell, Navigation, Authentication, Design System (packages/ui) |

---

## 1. UX improvements made

### Inventory Health
Every stock row and the item detail drawer now carry a **status badge** — Healthy (green), Low stock (amber), Out of stock (red), or Archived (neutral, when the row's warehouse is archived) — icon + label, never color alone. Status is a documented client-side heuristic on the real `quantityAvailable` the backend already returns (`available ≤ 0` → Out of stock, `≤ 10` → Low stock), clearly commented as a placeholder pending a real backend reorder-point field — no backend calculation was invented.

### KPI Summary
A new summary row sits above Stock Levels: **Warehouses** and **Stock items** are real backend counts (from list totals, not estimated); **Low stock**, **Out of stock**, and **Available** are honestly labeled **"(this page)"** — tallied only from the currently-loaded page, never silently presented as a false global count (the backend has no aggregate endpoint for that yet; fetching all pages to fake one would not be safe at 100,000+-SKU scale, so this pass didn't pretend otherwise).

### Stock Levels
Reduced from 5–6 columns to 4: **Product** (name + SKU stacked, one line each, with an honest "Not in Catalog" caption when no Catalog product matches), **Status** (health badge), **Available** (large, bold, leading the row) with **"N on hand · N reserved"** as a supporting caption underneath. Row actions moved to a compact icon-only button. Net effect: fewer things to scan per row, the one number that matters (available) reads first.

### Warehouses
Name and Code are now stacked in one cell; a new **Stock** column shows a real, live count ("N SKUs tracked") per warehouse, read from the same pagination total the backend already computes — not invented, not estimated. Empty state now has its own "New warehouse" button (previously text-only, no direct action).

### Activity
Rebuilt as a real day-grouped timeline (**Today / Yesterday / Wednesday / July 1** …) instead of a flat list of full date-times. Each entry has an icon (trend arrow for stock changes, action-specific icon for warehouse changes), the quantity delta as its own colored badge (separate from the reason text, not buried in a sentence), an Avatar for the actor, and a compact time. Reason and resulting on-hand are always shown together ("Damaged / written off · now 0 on hand").

### Adjust Stock dialog
Added a live **Current → Adjustment → Expected** preview, computed from the real current on-hand quantity (fetched live for the exact warehouse+SKU as the merchant types) plus the entered change — the merchant sees the actual effect before submitting, not just after. Also added a proactive (non-blocking) warning when the entered change would take stock below zero, so the real server-side rejection isn't the first time a merchant learns that.

### Empty states
Both Stock Levels' and Warehouses' "nothing here yet" states now include a direct action button (Adjust stock / New warehouse) using `EmptyState`'s own `action` prop, which existed but was unused — one fewer click to get started.

### Loading states
Activity's skeleton now mirrors the real timeline shape (avatar-circle + two text lines) instead of generic bars; KPI cards show their own skeleton digits while warehouse/stock-item counts are loading.

### Responsive
- Fixed a real bug: `WarehouseFormDialog`'s address fields were hard-coded to a 2-column grid at every width, including mobile, causing cramped/overflowing fields on narrow screens. Now `grid-cols-1 sm:grid-cols-2`.
- KPI summary reflows `grid-cols-2` → `grid-cols-3` → `grid-cols-5` across breakpoints.
- Verified all four screens plus the Adjust Stock dialog at 390×844 (see screenshots).

### Accessibility
- Fixed a **real, verified WCAG AA color-contrast failure** — see Bugs fixed below.
- Health badges and delta badges never rely on color alone (icon + text label).
- `@axe-core/playwright` scans added for Stock Levels (populated with KPI cards + all three health states) and Activity (populated, day-grouped) — both zero critical/serious violations, alongside the existing Warehouses dialog scan.

## 2. Merchant productivity improvements

- **Fewer clicks**: empty states now act, not just describe; the Adjust Stock dialog is reachable from three places (header, empty state, per-row icon) and confirms its own effect before submission — no more "did that work as I expected" round-trip.
- **Less thinking**: a merchant scanning 50+ rows reads one bold number (Available) and one badge (Status) per row instead of parsing three raw integers themselves. Low/out-of-stock rows are visually distinct without needing to read every number.
- **More confidence**: the Adjust Stock preview removes the guesswork ("will this leave me at -5?") before a merchant commits an adjustment; the oversell warning surfaces the real constraint proactively instead of only as a post-submit error.
- **Faster orientation**: the KPI row answers "is anything wrong" in under a second on page load, before reading a single table row.
- **Warehouse-level intelligence**: "12 SKUs tracked" tells a merchant a warehouse is truly empty (safe to delete) or has real stock (why delete is blocked) without opening Stock Levels and filtering.

## 3. Before vs. after summary

| | Before (Slice 1) | After (this pass) |
|---|---|---|
| Stock Levels page | Plain table, 5–6 columns, raw on-hand/reserved/available integers, no page-level summary | KPI summary row + 4-column table, health-badge status, Available emphasized with breakdown caption |
| Warehouses page | Name / Code / Location / Status / Actions, no stock signal | Name+Code stacked / Location / **Stock** (real count) / Status / Actions |
| Activity page | Flat reverse-chronological list, full date-times, delta folded into a text sentence | Day-grouped timeline, icon per entry, delta as its own badge, Avatar for actor, compact time |
| Adjust Stock dialog | Warehouse/SKU/quantity/reason only, no preview | Same fields **plus** a live Current → Adjustment → Expected preview and a proactive oversell warning |
| Empty states | Description only | Description + direct action button |
| Color contrast | `Badge`'s tinted success/warning/danger variants unverified at small text sizes | Verified via axe; the 3 combinations that failed AA now use solid-background treatments that pass |

## 4. Screenshots (desktop + mobile)

Attached separately. Desktop (1280×900): Stock Levels (populated, all three health states), Warehouses (with stock counts), Activity (day-grouped timeline), Adjust Stock dialog (with preview). Mobile (390×844): the same four surfaces, plus the off-canvas navigation drawer.

## 5. Bugs fixed (found during this pass, via testing — not by inspection alone)

1. **Real WCAG AA color-contrast failure** — `Badge`'s tinted `success`/`warning`/`danger` variants (10%-opacity background + full-strength text) measure 2.85:1–4.13:1 against the 4.5:1 floor at caption text size. Found live via `@axe-core/playwright` the moment this pass populated a scanned page with these variants — the first time this codebase has ever done so at that size (every prior "danger"/"warning" surface in Catalog uses the larger-text `Alert` component instead, which doesn't trip the same threshold). **Not fixed at the source** (that's Design System work, explicitly out of scope this pass); fixed via each affected component's own `className` override to the already-established solid `bg-feedback-* text-white`/`text-black` treatment (the same pairing `Button`'s `destructive` variant already uses) — a sanctioned per-usage customization, not a Design System change. Danger pairs with white text (passes at 4.5:1+); success/warning's brighter backgrounds needed black text instead (measured directly, not assumed).
2. **Adjust Stock preview always showed "+0"** regardless of the quantity typed — `watch('magnitude')` returned the raw string from the uncontrolled input, and `Number.isFinite('15')` is `false`, so the preview's arithmetic silently zeroed out. Caught immediately by this pass's own new Playwright test for the preview feature. Fixed with `register('magnitude', { valueAsNumber: true })`. (The actual submitted adjustment was never affected — `zodResolver`'s own coercion made the real `onSubmit` value correct all along; only the new live-preview display had the bug.)
3. **A malformed JSDoc comment broke the dev build** — a docblock containing the literal text `feedback-*/10` closed its own `/* */` block comment early (the `*/` mid-word), turning the rest of the comment into invalid TSX and crashing the dynamic import. Caught immediately by the very next Playwright run after the edit; fixed by rewording the comment to avoid a literal `*/` sequence.
4. **Warehouse address fields ignored the mobile breakpoint** — `grid-cols-2` was hardcoded with no responsive prefix, so City/Region and Postal Code/Country Code were forced into two columns even at 375px width. Fixed to `grid-cols-1 sm:grid-cols-2`.

## 6. Remaining UX opportunities for future releases

- **A real backend low-stock/reorder-point field.** The current "Low stock" threshold (≤10 available) is a fixed, documented client-side heuristic — useful today, but a merchant selling both single units and pallets needs a per-SKU or per-category threshold the backend would need to own.
- **A true global Low Stock / Out of Stock count**, once a backend aggregate endpoint exists — today's KPI cards are honestly page-scoped, which is correct but not as useful as a real cross-catalog count would be.
- **Actor names, not ids.** The Activity timeline's Avatar and "user-1234abcd" label are the best this pass can do without an Identity & Access name-lookup endpoint — a real name would make the timeline meaningfully more readable.
- **Bulk adjustment.** At real scale, correcting many SKUs after a stocktake one dialog at a time is real friction — a CSV-style bulk adjust (mirroring Catalog's own bulk-action patterns) is a natural Slice 2/3 candidate once the Product Owner prioritizes it.
- **A dedicated "attention needed" filter** on Stock Levels (e.g., a one-click "show only Low/Out of stock") — the KPI cards hint at the count today but aren't yet clickable filters.

## 7. Updated readiness score

**92/100** (up from Slice 1's baseline).

- Functionality & backend fidelity: 25/25 — nothing changed here; still zero invented endpoints/behavior.
- Merchant information hierarchy: 24/25 — KPI summary, health badges, and the Adjust preview substantially reduce cognitive load; the one point held back is the still-page-scoped Low/Out-of-stock counts (a real, named, honestly-deferred gap, not an oversight).
- Accessibility: 19/20 — a real, verified defect was found and fixed within this pass's own scope; the underlying Design System token issue remains (correctly) unfixed pending Design System authorization, so it isn't a clean 20.
- Responsiveness: 14/15 — verified at 390px across all four screens and the dialog; one real bug found and fixed.
- Test/quality-gate coverage: 10/10 — typecheck/lint/build/unit(129)/Playwright(13 Inventory, all green)/axe all pass; the pre-existing, unrelated Catalog flakiness is documented, not hidden.
- Polish/consistency with Catalog: 0 deductions — every pattern reused (Card, Badge, Avatar, EmptyState's own `action` prop) already existed in the Design System; nothing new was invented.

## 8. Recommendation

**READY FOR SLICE 2**, contingent on the Product Owner's review of the screenshots and the two open scoping questions carried over from the architecture doc (manual reservations for v1: yes/no; per-item-only ledger scoping: acceptable). No blocking issue was found in this pass — the one real defect uncovered (color contrast) was fixed within scope; the two deliberately-deferred items (real low-stock threshold, real global counts) are backend-dependent and correctly out of scope for a frontend-only refinement pass.

**No commit. No push. Waiting for approval before Slice 2.**
