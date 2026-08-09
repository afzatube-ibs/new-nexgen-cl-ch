# Phase 2.1 — Admin Engine Foundation: Completion Report

| Field | Value |
|---|---|
| **Date** | 2026-08-09 |
| **Author** | Chief Software Architect & Lead Engineer |
| **Authorized by** | Product Owner, 2026-08-09 |
| **Scope** | The permanent Admin Engine foundation only — shell, design system, auth, module-registration framework, shared CRUD/dashboard/settings infrastructure. **No business module** (Catalog, Orders, Customers, Inventory, Reports, Storefront) implemented, per explicit, repeated Product Owner instruction. |
| **Governing architecture** | `ADR-0005` (Admin Interface stack), `ADR-0009` (frontend monorepo/shared-package strategy), `docs/frontend/DESIGN_SYSTEM.md`, `docs/frontend/ADMIN_SHELL_ARCHITECTURE.md` — all Accepted in Phase 2.0. No architectural decision in those documents was revisited or redesigned; this report is an implementation record, not a design record. |
| **Related** | `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/RELEASE_MANAGEMENT.md` (the governance task immediately preceding this phase) |

---

## 1. Summary

Phase 2.1 stood up `apps/admin` and `packages/tokens`/`ui`/`api-client`/`config` as real, running, tested code — exactly the monorepo layout `ADR-0009` specified in Phase 2.0, with zero architectural deviation. Every quality gate the Product Owner named runs and passes: `npm run lint`, `npm run typecheck`, `npm run build`, unit tests, Playwright e2e tests, automated accessibility checks (`@axe-core`), and a bundle-analysis pass. Six real defects were found and fixed via those gates — not assumed away — and are documented in §7 with root cause and fix, not just a pass/fail line.

**What this phase deliberately did not do**: implement any business module's screens; build per-component Storybook-style story files (`docs/frontend/DESIGN_SYSTEM.md` §2's own stated bar names both a story and a test per component — the test half is met, the story half is named as a gap in §8); run Playwright against a live `apps/backend` instance (none was running in this development session — network-mocked instead, named as remaining work).

---

## 2. Architecture Implemented

Matches `ADR-0009`'s specified structure exactly:

```
apps/
  admin/            React 18 + TypeScript (strict) + Vite — ADR-0005
packages/
  tokens/           Design tokens (docs/frontend/DESIGN_SYSTEM.md §1) + Tailwind preset
  ui/               26-component library on Radix UI primitives + @nexgen/tokens
  api-client/       Typed REST client against apps/backend's real envelope
  config/           Shared TypeScript/ESLint/Prettier base config
```

- **Package boundary rule** (`ADR-0009`: "an `apps/*` app may only depend on `packages/*`, never on another `apps/*` app directly") is enforced as an ESLint **error** via `eslint-plugin-boundaries` (`packages/config/eslint.base.js`), not a documented-but-unenforced convention — matching the backend's own `deptrac.yaml` discipline this ADR was explicitly modeled on.
- **Design tokens are one canonical source** (`packages/tokens/src/tokens.js`): color (light/dark semantic layer over Tailwind's primitive scale, including the one deliberate custom addition, `slate.850`, that `DESIGN_SYSTEM.md` §1.1 calls for and Tailwind's default scale doesn't have), typography, elevation (with a real, distinct dark-mode shadow strategy per §1.4, not opacity-scaled-to-zero), radius, motion. Consumed identically by `packages/ui`'s runtime code and `apps/admin`'s Tailwind config via `presets: [nexgenPreset]` — no value is hand-copied anywhere.
- **API contract fidelity**: `packages/api-client` was built by reading `apps/backend`'s actual source (`AuthController.php`, `UserResource.php`, `RoleResource.php`, `PermissionResource.php`, `bootstrap/app.php`'s exception-render mapping) rather than assumed from the API standard document alone — the typed error hierarchy (`UnauthenticatedError`/`ForbiddenError`/`ValidationApiError`/`ConflictError`/`RateLimitedError`) mirrors the backend's exact `{error: {type, message, details}}` envelope and status-code mapping.

---

## 3. Components Created (`packages/ui`)

All 26, matching `docs/frontend/DESIGN_SYSTEM.md` §2's inventory exactly, each Radix-primitive-backed where one exists:

Button, Input, Textarea, Checkbox, Radio(Group), Select, DropdownMenu, Badge, Avatar, Card, Dialog, Drawer, Tabs, Toast (+ `useToast`/`Toaster`), Alert, Tooltip, Popover, Table + `DataTable`, Pagination, EmptyState, Loading (Spinner/LoadingOverlay), Skeleton, ErrorState, Chart, Typography (`Text`), Label, Icon — plus **`SegmentedControl`** (new, added during self-review; see §7.6), the Admin Shell's real Theme Toggle built directly on Radix `RadioGroup` for correct keyboard behavior.

Each component satisfies `UI:ACCESSIBILITY`'s baseline (focus-visible not focus, full keyboard operability, semantic HTML/ARIA, color never the only signal, `prefers-reduced-motion` respected) either by construction (Radix-backed) or by explicit implementation + test (`Table`'s sort/select, `Checkbox`'s indeterminate state).

**Named gap** (§8): no `.stories` file per component. `docs/frontend/DESIGN_SYSTEM.md` §2 states "no component ships without both" a story and a test — every component has a real, passing `.test.tsx` where behavior warrants one (Button, Checkbox, DataTable, ThemeProvider — 14 tests total in `packages/ui`), but a visual-reference story file was not built in this foundation pass.

---

## 4. Pages Created (`apps/admin`)

| Page | Route | Notes |
|---|---|---|
| `LoginPage` | `/login` | React Hook Form + Zod; maps the backend's real 422 to field errors; `returnTo` deep-link redirect, hardened against open-redirect (§7.7) |
| `DashboardPage` | `/` (index) | Renders registered dashboard widgets; genuinely empty today — real `EmptyState`, no fake KPI |
| `SettingsPage` | `/settings` | Renders registered settings panels as Tabs; genuinely empty today — real `EmptyState`, no hardcoded panel |
| `ForbiddenPage` | (rendered by `RequirePermission`) | 403 — distinct from 404: the route exists, the operator isn't allowed to see it |
| `NotFoundPage` | `*` (catch-all) | 404 |

Both Dashboard and Settings are registered through the identical `registerModule()` mechanism a future business module uses (`apps/admin/src/modules/dashboard/module.ts`, `.../settings/module.ts`) — proof the Module Registration Framework needs no special-casing for "built-in" vs. "business" modules, not merely a claim.

---

## 5. Shared Infrastructure

- **Admin Shell** (`apps/admin/src/shell/`): `AdminShell`, `Header`, `Sidebar` + `SidebarNav`, `Breadcrumbs`, `WorkspaceSwitcher` (real data, `GET /api/v1/stores`, intentionally-disabled dropdown per the accepted architecture's own "coming soon" scope), `NotificationCenter` (placeholder trigger, per architecture doc §9's explicit boundary), `ThemeToggle` (fully real), `UserMenu`, `CommandPalette` (foundation only — keybinding + shell, no results UI, per architecture doc §9), `uiStore` (Zustand — sidebar collapse, mobile nav, command palette open state).
- **Authentication** (`apps/admin/src/auth/`): `authStore` (Zustand + `localStorage` token), `useAuth`, `AuthProvider` (session restore), `ProtectedRoute`, `RequirePermission`, `permissions.ts` (permission-set flattening/checking).
- **Module Registration Framework** (`apps/admin/src/registry/`): `types.ts`, `moduleRegistry.ts` — `registerModule()`, `getNavigationTree()`, `getAllRoutes()`, `getDashboardWidgets()`, `getSettingsPanels()`, all permission-filtered.
- **Shared Framework** (`apps/admin/src/framework/`): `PageHeader`, `Toolbar`, `FilterBar`, `BulkActionsBar`, `CrudPageLayout`, `ConfirmDialog`, `ImportDialog` (real CSV parsing), `ExportButton` (real CSV generation), `csv.ts`, `applyServerValidationErrors.ts`.
- **Extension points** (`apps/admin/src/extension-points/index.ts`): type-only contracts for Themes, Marketplace/Extensions, Update Engine, Media Picker, Localization, Notification Center data — zero runtime code, deliberately (see file's own docblock for why a stub would itself be the forbidden "placeholder implementation").

---

## 6. Authentication Verification

Verified via 5 of the 11 Playwright e2e tests (`apps/admin/e2e/auth.spec.ts`), network-mocked against the real backend contract (§8 names the live-backend gap):

- ✅ Unauthenticated visit to a protected route redirects to `/login?returnTo=...`
- ✅ Successful login redirects to the originally-requested route and renders the authenticated shell
- ✅ Invalid login shows the server-mapped error message, stays on `/login`
- ✅ Session restore (existing token) renders the shell directly, no login flash
- ✅ Sign out clears the session and returns to `/login`

Additionally verified live, via the running dev server: Login page renders correctly with zero console errors; token/session state genuinely persists across reload.

**401 handling**: `ApiClient`'s `onUnauthenticated` hook clears the session store globally on any 401, from any request, not just the initial session-restore check.
**403 handling**: `RequirePermission` renders `ForbiddenPage` for any route or inline control the operator's permission set doesn't satisfy — verified by Playwright (`shell.spec.ts`).
**Permission-aware navigation**: `Sidebar` renders from `getNavigationTree(permissions)` — hides, never disables-but-shows, an entry the operator lacks permission for (unit-tested in `moduleRegistry.test.ts`).

---

## 7. Quality Gate Results

All commands below were run for real, in this session, against the code in this commit — not asserted from memory.

| Gate | Result |
|---|---|
| `npm run typecheck` (4 workspaces) | ✅ Clean |
| `npm run lint` (`apps/admin`, `packages/ui` — the 2 workspaces with a lint script) | ✅ Clean |
| `npm run build` (`apps/admin`) | ✅ Clean, no chunk-size warning (post bundle-analysis fix, §7.8) |
| Unit tests (Vitest + React Testing Library) | ✅ **49/49 passing** — 22 `apps/admin`, 13 `packages/api-client`, 14 `packages/ui` |
| Playwright e2e (`apps/admin/e2e/`) | ✅ **11/11 passing** |
| Accessibility (`@axe-core/playwright`, within the Playwright suite) | ✅ **0 critical/serious violations** on Login and Dashboard |
| `npm audit` | 5 vulnerabilities remain (see §7.6/§8) — down from 10 found; all fixable-without-breaking-change ones fixed |

### 7.1 — `Tooltip must be used within TooltipProvider` (crash)

**Found**: live, via Playwright — every authenticated-shell test failed with an "Unexpected Application Error" screen. **Root cause**: `TooltipProvider` was scoped inside `Sidebar.tsx` only; `Header.tsx`'s own `WorkspaceSwitcher`/`NotificationCenter` also render `Tooltip` and are a sibling of `Sidebar`, outside that scope. **Fix**: one `TooltipProvider` now wraps the entire `AdminShell`.

### 7.2 — WCAG AA color-contrast failure (Login submit button)

**Found**: live, via the Playwright accessibility scan (`axe-core`: `color-contrast`, serious, 2.83:1 measured vs. 4.5:1 required). **Root cause**: `tailwind-merge`'s default class-group heuristic doesn't recognize this platform's own custom `fontSize` scale (`text-display`/`heading`/`subheading`/`body`/`body-strong`/`caption`/`code`, from `packages/tokens`) as Tailwind's built-in size-keyword scale, so it classified those utilities into the `text-color` conflict group instead — silently dropping `Button`'s real `text-white` the moment it was combined with a `text-body`-style size class via `cn()`. **Fix**: `packages/ui/src/lib/cn.ts` now uses `extendTailwindMerge` to register the real `font-size` class group, fixing every affected component at the merge-function level, not per call site.

### 7.3 — Broken `Checkbox`/`RadioItem` label association

**Found**: by the component's own test (`getByRole('checkbox', { name: 'Accept terms' })` matched nothing). **Root cause**: no `id` was generated when the caller supplied a `label` but no explicit `id`, so `htmlFor={undefined}`. **Fix**: `useId()` fallback, matching `Input`/`Textarea`'s existing pattern.

### 7.4 — Mobile header horizontal overflow

**Found**: via a manual four-breakpoint (1440/1280/834/390px) visual QA pass with real screenshots (not simulated) — measured `document.documentElement.scrollWidth: 431` vs. `clientWidth: 390` at 390px. **Root cause**: the Workspace Switcher's store-name text plus the full right-side icon cluster didn't fit in the available width. **Fix**: store name hidden below `sm` (matching the pattern the search bar already used); `min-w-0`/`shrink` added to the relevant flex containers. Re-measured after fix: `scrollWidth === clientWidth === 390`, zero overflow.

### 7.5 — Test-environment failures unrelated to the code under test

`jsdom` implements no `matchMedia` at all (`ThemeProvider`/`usePrefersReducedMotion` both call it unconditionally); separately, Node 22+'s own native, unconfigured `globalThis.localStorage` getter shadowed jsdom's real implementation. Both fixed in `vitest.setup.ts` (a `matchMedia` stub; `NODE_OPTIONS=--no-experimental-webstorage` via `cross-env` on the `test` script) — full root-cause explanation left in-repo in both setup files for the next person who hits either.

### 7.6 — `npm audit`: critical `handlebars` vulnerability

Pulled in transitively by `eslint-plugin-boundaries@5`'s own `@boundaries/elements` dependency — a devDependency only, never shipped to a production bundle, but fixed rather than left: bumped to `eslint-plugin-boundaries@^7.1.0` (depends on a patched `handlebars`). `react-router-dom` was separately bumped `^6.28.0` → `^7.18.2` for its own audit-flagged CVEs (open redirect, SSR-hydration constructor injection) — a `v6+`-compatible bump per `ADR-0005`'s own decision text, not a new library choice.

**Remaining, not fixed**: `esbuild`/`vite`/`vitest`'s own dev-server-only CORS-read advisory (`GHSA-67mh-4wv8-2f99`) requires a breaking Vite 5→8 major upgrade this session did not have the regression-testing capacity to safely verify. Affects the local dev server only, never a production build artifact. Named here rather than silently carried.

### 7.7 — Hardening beyond what was asked: open-redirect on the login `returnTo`

While fixing 7.6's `react-router-dom` CVEs, noticed this codebase's own `returnTo` deep-link value (from a URL query parameter — fully attacker-controlled via a crafted link) was passed to `navigate()` after only a `decodeURIComponent`. Added `apps/admin/src/lib/safeRedirect.ts` (`safeRelativePath`), rejecting `//`, `/\`, and embedded `://` payloads, with 5 dedicated unit tests — independent of, and in addition to, the library-level fix.

### 7.8 — Bundle analysis

Initial build: one 576.83 KB (178.44 KB gzip) entry chunk, past Vite's own 500 KB warning threshold. **Root cause**: `packages/tokens`/`ui`/`api-client` lacked `"sideEffects": false`, so Rollup could not safely tree-shake unused barrel exports (Recharts — entirely unused today, no dashboard widget exists yet) across the workspace-link boundary. **Fix**: `"sideEffects": false` (`["*.css"]` for `packages/ui`) on all three packages, plus `apps/admin/vite.config.ts`'s `manualChunks` splitting remaining vendor code by real reason-to-change. **Result**: main entry 69.20 KB (20.97 KB gzip); `vendor-charts` 0.46 KB (Recharts genuinely tree-shaken); largest chunk `vendor-react` 233.78 KB (76.48 KB gzip); zero chunk-size warning.

### 7.9 — Self-review findings (duplication, a11y, performance)

- **Duplication**: `Dialog`/`Drawer` header/title/description were fully duplicated despite being identical under the hood (`RadixDialog.Title`/`Description` either way). `Drawer` now re-exports `Dialog`'s versions directly; only `DrawerContent` (anchor/slide) and `DrawerFooter` (`mt-auto`) still differ for a real reason.
- **Accessibility**: `ThemeToggle`'s hand-rolled `role="radio"` buttons only supported per-option `Tab`, not the roving-tabindex/arrow-key pattern `UI:ACCESSIBILITY` requires for "components with a natural directional model." Replaced with a new, genuinely reusable `packages/ui` component, `SegmentedControl`, built directly on Radix `RadioGroup` — correct keyboard behavior by construction, and available to any future module needing the same icon-toggle pattern.
- **Performance**: `Sidebar`/`DashboardPage`/`SettingsPage` now `useMemo` their registry lookups against the operator's permission set, rather than re-walking/re-filtering the module registry on every unrelated re-render.
- **Security**: no `dangerouslySetInnerHTML`, `eval()`, or `new Function()` anywhere in `apps/admin`/`packages/ui` (grepped, confirmed empty); no hardcoded hex colors outside `packages/tokens` (grepped, confirmed empty — every color traces to a semantic token).

---

## 8. Remaining Work Before Business Modules

Named explicitly, not silently deferred:

1. **Per-component `.stories` files** — `docs/frontend/DESIGN_SYSTEM.md` §2's stated bar. Every component has a real test; the visual-reference half was not built this pass.
2. **Live-backend Playwright pass** — this session's e2e suite is network-mocked (`apps/admin/e2e/mocks.ts`) against the documented/read contract, not a running `apps/backend` instance. A pass against a real `docker compose up` backend is recommended before the first business module ships.
3. **`esbuild`/`vite`/`vitest` dev-tooling CORS advisory** (§7.6) — a deliberate, disclosed, not-yet-taken breaking upgrade.
4. **Global search / notification panel real implementations** — explicitly out of `docs/frontend/ADMIN_SHELL_ARCHITECTURE.md` §9's own scope; the Header's placeholder triggers are real and wired for a future module to complete.
5. **Extension points in `apps/admin/src/extension-points/index.ts`** remain type-only contracts by design — Themes, Marketplace, Update Engine, Media Picker, Localization, and the real Notification Center data source are all future, separately-approved work.

None of the above blocks starting a business module — they are gaps in *this phase's own* completeness bar, not blockers to Phase 2.1's stated goal (a permanent, reusable Admin Engine foundation).

---

## 9. Explicit Statement

Per the Product Owner's own instruction: **no business module (Catalog, Orders, Customers, Inventory, Reports, Storefront) has been implemented in this phase.** Work stops here pending explicit Product Owner approval to begin the next module.
