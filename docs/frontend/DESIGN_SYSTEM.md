# neXgen Core — Frontend Design System

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-08 |
| **Phase** | 2.0 — Frontend Architecture & Design (architecture/specification only — no implementation code exists yet) |
| **Implements** | `docs/07_UI_DESIGN_SYSTEM.md` (the constitutional, framework-agnostic design philosophy) |
| **Package** | `packages/tokens` (values), `packages/ui` (components) — per `ADR-0009` |
| **Stack** | React + TypeScript, Tailwind CSS, Radix UI primitives, Lucide icons — per `ADR-0005` |

---

## 0. Relationship to `docs/07_UI_DESIGN_SYSTEM.md`

`07_UI_DESIGN_SYSTEM.md` is deliberately framework-agnostic and value-free ("Zero implementation leakage — no CSS, frameworks, or literal token values") — it defines *what* every token category and component must achieve (`UI:DESIGN_TOKENS`, `UI:COMPONENTS`, `UI:ACCESSIBILITY`, etc.), never *how*. This document is that "how": the concrete token values, the concrete component inventory, and the concrete framework mapping (`packages/tokens`, `packages/ui`) that Phase 2.1's real implementation is built from. Every section below cites the `UI:*` identifier it implements. No value here may contradict `07_UI_DESIGN_SYSTEM.md`'s own philosophy; where this document is silent, that document remains authoritative.

---

## 1. Design Tokens (implements `UI:DESIGN_TOKENS`, `UI:COLOR_SYSTEM`, `UI:TYPOGRAPHY`, `UI:SPACING_SYSTEM`, `UI:ELEVATION_SHADOWS`, `UI:BORDERS_RADIUS`)

`packages/tokens` is the single source of truth — a plain TypeScript object tree (not CSS, not a build-time-only format) so both `apps/admin`'s and `apps/storefront`'s Tailwind configs, and any runtime code that needs a token value directly (e.g. a chart's own color scale), consume the exact same values. Each Tailwind config extends its `theme` from this object; neither app hardcodes a token value of its own.

### 1.1 Color

A semantic layer over a primitive scale — components reference the semantic name (`color.surface.default`), never a primitive shade (`gray.50`) directly, so a future rebrand or a new theme's override (`docs/frontend/THEME_ENGINE_ARCHITECTURE.md`) changes one mapping, not every component.

| Semantic token | Light mode | Dark mode | Used for |
|---|---|---|---|
| `color.surface.default` | `white` | `slate.900` | Page/card background |
| `color.surface.subtle` | `slate.50` | `slate.800` | Secondary panels, table row stripe |
| `color.surface.overlay` | `white` | `slate.850` | Dialogs, drawers, popovers |
| `color.border.default` | `slate.200` | `slate.700` | Dividers, input borders |
| `color.text.primary` | `slate.900` | `slate.50` | Body text |
| `color.text.secondary` | `slate.500` | `slate.400` | Helper text, labels |
| `color.text.disabled` | `slate.300` | `slate.600` | Disabled control text |
| `color.brand.default` / `.hover` / `.active` | `indigo.600` / `700` / `800` | `indigo.500` / `400` / `300` | Primary actions, active nav item |
| `color.feedback.success` | `emerald.600` | `emerald.400` | Success alerts/toasts/badges |
| `color.feedback.warning` | `amber.600` | `amber.400` | Warning alerts/toasts/badges |
| `color.feedback.danger` | `red.600` | `red.400` | Destructive actions, error states |
| `color.feedback.info` | `sky.600` | `sky.400` | Informational alerts |
| `color.focus.ring` | `indigo.500` (always, both modes) | | Focus indicator — see §5 |

Primitive scale: Tailwind's own default `slate`/`indigo`/`emerald`/`amber`/`red`/`sky` palettes (50–950 steps) are the primitive layer beneath the semantic tokens above — not redefined from scratch, since Tailwind's defaults already satisfy `UI:COLOR_SYSTEM`'s implicit accessibility-contrast expectations at the steps used here. A brand-specific primitive palette remains a future, additive change to this table alone; no component ever references a primitive shade directly, so that change never touches component code.

### 1.2 Typography (`UI:TYPOGRAPHY`)

Single font family platform-wide (admin and storefront both, per `07_UI_DESIGN_SYSTEM.md`'s single design language) — **Inter**, variable weight, loaded via `next/font`/Vite's own font-loading (self-hosted, never a runtime Google Fonts request, for both privacy and performance per `docs/frontend/PERFORMANCE_FOUNDATION.md`).

| Token | Size / Line-height | Weight | Used for |
|---|---|---|---|
| `text.display` | 36px / 44px | 600 | Page-level headings (rare — most admin screens use `text.heading`) |
| `text.heading` | 24px / 32px | 600 | Section headings, dialog titles |
| `text.subheading` | 18px / 28px | 600 | Card titles, table section headers |
| `text.body` | 14px / 20px | 400 | Default body text, table cells, form labels |
| `text.body-strong` | 14px / 20px | 600 | Emphasized body text |
| `text.caption` | 12px / 16px | 400 | Helper text, timestamps, metadata |
| `text.code` | 13px / 20px, monospace (`JetBrains Mono`) | 400 | IDs, correlation ids, API-shaped values |

A 14px default body size (not 16px) is deliberate for the admin interface's own density needs — an authenticated, daily-use, data-dense tool per `UI:DENSITY`'s own comfortable/compact spectrum favors the compact end; the storefront's own Theme Package may override `text.body` upward for its own reading-comfort needs, per `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`'s token-override contract.

### 1.3 Spacing (`UI:SPACING_SYSTEM`)

A 4px base unit, exposed as `space.0` through `space.24` (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px) — Tailwind's own default spacing scale, adopted rather than reinvented, since it already satisfies `UI:SPACING_SYSTEM`'s "a consistent, small, composable step scale" requirement.

### 1.4 Elevation (`UI:ELEVATION_SHADOWS`)

| Token | Used for |
|---|---|
| `elevation.0` | Flat — no shadow (default surface) |
| `elevation.1` | Card, table row hover |
| `elevation.2` | Dropdown, popover, tooltip |
| `elevation.3` | Dialog, drawer |
| `elevation.4` | Toast (always above everything else) |

Dark mode does not scale shadow opacity down to zero (a common but wrong instinct) — it uses a subtler, cooler-toned shadow plus a 1px `color.border.default` outline, since a pure shadow reads poorly against a dark surface; this is `packages/tokens`' own documented dark-mode elevation strategy, not left to per-component improvisation.

### 1.5 Border Radius (`UI:BORDERS_RADIUS`)

| Token | Value | Used for |
|---|---|---|
| `radius.sm` | 4px | Badge, checkbox, small controls |
| `radius.md` | 6px | Button, input, select — the default for most controls |
| `radius.lg` | 8px | Card, dialog, drawer panel |
| `radius.full` | 9999px | Avatar, pill badge, toggle track |

### 1.6 Breakpoints (`UI:RESPONSIVE_BREAKPOINTS`)

Tailwind's own default breakpoint scale, unmodified: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px. The admin shell's own responsive behavior (`docs/frontend/ADMIN_SHELL_ARCHITECTURE.md` §4) is specified against these exact values — sidebar collapses below `lg`, not a bespoke breakpoint.

### 1.7 Motion (`UI:MOTION_ANIMATION`, `UI:MICROINTERACTIONS`)

| Token | Value | Used for |
|---|---|---|
| `motion.duration.fast` | 100ms | Hover/active state changes, focus ring |
| `motion.duration.default` | 200ms | Dropdown/popover open-close, tab switch |
| `motion.duration.slow` | 300ms | Dialog/drawer enter-exit, route transitions |
| `motion.easing.default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard "ease-in-out," used everywhere above |

Every animated component respects `prefers-reduced-motion: reduce` (opacity-only cross-fade at `motion.duration.fast`, no transform/slide) — implemented once, in `packages/ui`'s own shared animation utility, not per component, per `UI:ACCESSIBILITY`'s own motion-sensitivity requirement.

---

## 2. Component Inventory (implements `UI:COMPONENTS`, `UI:FORMS`, `UI:TABLES`, `UI:FEEDBACK_STATES`, `UI:EMPTY_STATES`, `UI:LOADING_STATES`, `UI:ERROR_STATES`)

Every component lives in `packages/ui/src/components/<Name>/`, exporting a typed React component plus its own `*.stories` (visual reference) and `*.test.tsx` (behavioral test) alongside it — no component ships without both, per Phase 2.0's own "fully tested, fully documented" quality bar. Components built on a Radix primitive inherit that primitive's keyboard/focus/ARIA behavior; components with no Radix equivalent (Badge, Card, Skeleton, Table) follow the shared a11y baseline in §5 directly.

| Component | Radix primitive | Key variants | Key states |
|---|---|---|---|
| **Button** | — (native `<button>`) | `primary` / `secondary` / `outline` / `ghost` / `destructive`; `sm` / `md` / `lg` | default, hover, active, focus-visible, disabled, loading (spinner replaces label, width preserved) |
| **Input** | — | `text` / `email` / `password` / `number` / `search` | default, focus, invalid (paired with inline error text), disabled, read-only |
| **Textarea** | — | fixed-rows / auto-grow | same as Input |
| **Checkbox** | `Checkbox` | single / indeterminate (for "select all" table headers) | default, checked, indeterminate, focus-visible, disabled |
| **Radio** (Group) | `RadioGroup` | vertical / horizontal layout | default, checked, focus-visible, disabled |
| **Select** | `Select` | single-select, searchable variant | default, open, selected, disabled, empty-options |
| **Dropdown Menu** | `DropdownMenu` | with icons, with destructive item styling, nested submenus | open/closed, item hover/focus, item disabled |
| **Table** | — (native `<table>`, `packages/ui`'s own composition) | sortable columns, row selection, sticky header | loading (Skeleton rows), empty (Empty State), error (Error State), populated |
| **Pagination** | — | page-number + prev/next, cursor-based (for large result sets) | default, current-page, disabled (at bounds) |
| **Badge** | — | `default` / `success` / `warning` / `danger` / `info` / `outline` | static (no interactive states) |
| **Toast** | `Toast` | `success` / `warning` / `danger` / `info`; with action button | entering, visible, exiting (auto-dismiss timer respects `prefers-reduced-motion` for its progress indicator too) |
| **Alert** (inline, non-dismissing banner) | — | same 4 semantic variants as Toast | static, dismissible variant |
| **Dialog** (modal) | `Dialog` | `sm` / `md` / `lg` / `fullscreen` (mobile) | open/closed, with confirm/cancel footer pattern |
| **Drawer** (side panel) | `Dialog` (Radix has no separate primitive — Drawer is a styled Dialog anchored to a viewport edge) | left / right anchor; `sm` / `md` / `lg` width | same as Dialog |
| **Tabs** | `Tabs` | line-indicator / pill style | active tab, keyboard arrow navigation between tabs |
| **Card** | — | with/without header, with/without footer actions | static; interactive variant (clickable card) adds hover/focus-visible |
| **Tooltip** | `Tooltip` | — | shown on hover/focus, respects `motion.duration.fast` |
| **Popover** | `Popover` | — | open/closed, same positioning engine as Dropdown Menu (Radix's own `Popper`) |
| **Loading** (spinner) | — | inline / full-panel overlay | — |
| **Skeleton** | — | text-line / block / avatar shapes, composed to match the real content's own layout | — |
| **Empty State** | — | with illustration slot, title, description, optional primary action | — |
| **Error State** | — | with retry action; distinct from a form field's inline validation error | — |
| **Chart** | — (Recharts wrapper, `ADR-0005`) | line / bar / area / donut, using `color.feedback.*`/`color.brand.*` tokens for series colors | loading (Skeleton), empty, populated |

**Deliberately not yet designed** (out of Phase 2.0's own scope): any component whose shape is dictated by a specific business module's data (e.g. an "Order Status Timeline" component) — those are Phase 2.1+ concerns, built from this inventory's primitives (Badge, Card, Tabs), not added to this foundational list.

---

## 3. Dark Mode / Light Mode (`UI:THEME_SYSTEM`)

- **Mechanism**: a `data-theme="light" | "dark"` attribute on the document root, toggled by `packages/ui`'s own `ThemeProvider`; Tailwind's `dark:` variant is configured to key off this attribute (`darkMode: ['class', '[data-theme="dark"]']`), not the OS-level `prefers-color-scheme` media query alone.
- **Default**: respects `prefers-color-scheme` on first load (no stored preference yet), then persists the operator's explicit choice — matching the honest "viewer's theme toggle stamps `data-theme` on the root" pattern already established by this platform's own published-artifact tooling elsewhere, for the identical reason (an explicit choice must win over the ambient default once made).
- **Storage**: `localStorage` for the admin interface (per-browser preference, consistent with an authenticated single-operator tool); the storefront defers this choice to `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`, since a merchant's own Theme Package may not offer a dark mode at all.
- **No component may hardcode a color** outside the semantic token table in §1.1 — this is what makes dark mode a token-mapping change, never a per-component `dark:` class audit.

---

## 4. Icon System (`UI:ICONS_ILLUSTRATIONS`)

**Lucide**, consumed directly (no wrapper component needed beyond a thin `<Icon name="..." />` re-export in `packages/ui` that fixes size/stroke-width to the design system's own two standard sizes — 16px for inline/inside-control icons, 20px for standalone/navigation icons) — one icon set, one visual weight, platform-wide.

---

## 5. Accessibility & Keyboard Navigation Baseline (`UI:ACCESSIBILITY`)

Every component in §2, regardless of whether it wraps a Radix primitive, must satisfy:

- **Focus-visible, not focus.** A visible focus ring (`color.focus.ring`, 2px offset outline) appears only for keyboard focus (`:focus-visible`), never for a mouse click — the standard, correct modern pattern that avoids the "focus ring on every click" complaint while never sacrificing keyboard visibility.
- **Full keyboard operability.** Every interactive component is operable via `Tab`/`Shift+Tab` (move), `Enter`/`Space` (activate), and `Escape` (dismiss, for anything dismissible) at minimum; components with a natural directional model (Tabs, Radio Group, Select, Dropdown Menu) additionally support arrow-key navigation within themselves. Radix primitives provide this by construction; §2's non-Radix components (Table row selection, Pagination) implement it explicitly and are tested for it (`*.test.tsx`, using Testing Library's own keyboard-interaction utilities, not just Radix's guarantees).
- **Semantic HTML and ARIA first.** A `<button>` is a `<button>`, a `<table>` is a `<table>` — ARIA attributes supplement native semantics, never replace them where a native element already carries the right meaning.
- **Color is never the only signal.** Every use of `color.feedback.*` (Badge, Alert, Toast, form validation) is paired with an icon and/or text label — a colorblind operator must be able to distinguish success from danger without relying on hue alone.
- **Motion respects `prefers-reduced-motion`** — see §1.7.

This baseline is enforced, not merely stated: `packages/config`'s shared ESLint configuration includes `eslint-plugin-jsx-a11y`, and Playwright's own accessibility-tree assertions (`@axe-core/playwright`) run against every `packages/ui` component's own story in CI once Phase 2.1 stands up real CI for the frontend — named here so Phase 2.1 inherits the requirement, not merely the intention.
