# neXgen Core — Admin Shell Architecture

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-08 |
| **Phase** | 2.0 — Frontend Architecture & Design (architecture/specification only — no implementation code exists yet) |
| **Package** | `apps/admin` (`ADR-0005`), consuming `packages/ui`, `packages/api-client`, `packages/tokens` (`ADR-0009`) |
| **Scope boundary** | This document specifies the **permanent shell** every future admin module (Users, Catalog, Orders, Search, Notifications, ...) renders inside. It does not implement, or even design, any module's own screens — those are Phase 2.1+ work, built *inside* this shell, never a reason to modify it. |

---

## 1. Why a Shell, Not 19 Independent Screens

The backend is 19 independently-owned modules (`docs/04_MODULE_ARCHITECTURE.md`) behind one consistent REST API contract (`06_API_STANDARD.md`). The admin interface must present that as **one coherent product**, not 19 disconnected tools — an operator moving from Orders to Returns to Notifications should never feel like they left one application and entered another. The Admin Shell is the concrete mechanism for that: a single, permanent layout (navigation, header, permission gating, theme, session) that every module's own screens render *into*, never re-implement for themselves.

This mirrors the backend's own `App\Providers\AppServiceProvider` composition-root pattern: individual modules own their own logic, but one shared, thin layer is responsible for composing them into a single running whole.

---

## 2. Layout Composition

```
┌─────────────────────────────────────────────────────────┐
│ Header: workspace switcher · global search · notif · user │
├────────────┬────────────────────────────────────────────┤
│            │ Breadcrumbs                                 │
│  Sidebar   ├────────────────────────────────────────────┤
│  (nav)     │                                              │
│            │           Module route content               │
│            │           (rendered by React Router)          │
│            │                                              │
└────────────┴────────────────────────────────────────────┘
```

- **`AdminShell`** (`apps/admin/src/shell/AdminShell.tsx`) is the top-level layout component wrapping every authenticated route. It owns the Header, Sidebar, and breadcrumb region; the routed content region is a plain `<Outlet />` (React Router) — the shell has no knowledge of which module is currently rendering inside it.
- **Unauthenticated routes** (the login screen only, per `ADR-0007`'s single-point-of-authentication reasoning already established on the backend) render outside `AdminShell` entirely, via a separate, minimal layout with no navigation chrome.

---

## 3. Header

Left to right: **workspace switcher** → (space) → **global search** → **notification center** → **theme toggle** → **user menu**.

- **Workspace switcher**: a placeholder control today (Phase 2.0 scope explicitly excludes building real multi-store/multi-tenant switching — `ARCHITECTURE_REVIEW_PHASE1.md` findings B-10/B-15 already establish the backend itself has no tenant boundary yet). Its contract is fixed now so a future real implementation is a data-wiring change, not a layout change: it renders the current Store Configuration `Store`'s own name (`GET /api/v1/stores`, already a real, working Phase 1 endpoint) and is visually present, but its dropdown affordance is disabled with a "Coming soon" state until multiple stores/tenants are a real concept to switch between.
- **Global search**: a placeholder input, wired to nothing yet. Its eventual target is `GET /api/v1/search/products` (Search module, Phase 1) plus, per that module's own accepted scope boundary, the `q`-filtered list endpoints Customers/Orders/Stores/Notification-templates already expose (`docs/04_MODULE_ARCHITECTURE.md` v1.5's Change Log) — a real, cross-module command-palette-style search is Phase 2.1 scope, not this shell's own architecture, since it requires real UI (a results dropdown, keyboard-navigable) this document deliberately does not design (see §9).
- **Notification center**: a placeholder bell icon with an unread-count badge, wired to nothing yet — its eventual backing is the Notifications module's own `GET /api/v1/notifications` (already real, working). Its panel/dropdown UI is out of this document's scope for the same reason as global search.
- **Theme toggle**: fully real, not a placeholder — a three-state control (Light / Dark / System), backed by `packages/ui`'s `ThemeProvider` (`docs/frontend/DESIGN_SYSTEM.md` §3). This is small enough, and foundational enough (every other component's dark-mode correctness depends on it existing), to build now rather than defer.
- **User menu**: avatar + name, opening a `DropdownMenu` (`packages/ui`) with: profile link (placeholder target), theme toggle shortcut, and Sign Out (fully real — calls the backend's existing `POST /api/v1/auth/logout`).

---

## 4. Sidebar

- **Structure**: a flat list of top-level module entries (Dashboard, Users & Roles, Catalog, Orders, Customers, Search, Notifications, ...), each optionally expandable to that module's own sub-sections (e.g. "Catalog" expands to Products / Categories / Brands / Attributes). The sidebar's own data model is a static, versioned navigation manifest (`apps/admin/src/shell/navigation.ts`) — not fetched from an API, since the set of *available* modules is a build-time property of what's deployed, not a runtime one.
- **Permission-aware rendering**: every navigation entry declares the permission key(s) (`06_API_STANDARD.md`/`08_SECURITY_STANDARD.md` `module.resource.action` shape, e.g. `catalog.products.view`) required to see it. The shell checks the current session's own permission set (from `GET /api/v1/auth/me`, already real) and hides — never disables-but-shows — any entry the operator lacks permission for. This mirrors the backend's own `EnsurePermission` middleware philosophy exactly: a denial is explicit and structural, never a visible-but-broken affordance.
- **Responsive behavior**: full sidebar (240px, labels + icons) at `lg` breakpoint and above (`docs/frontend/DESIGN_SYSTEM.md` §1.6); collapses to an icon-only rail (64px, tooltips on hover for labels) between `md` and `lg`; becomes an off-canvas Drawer (`packages/ui`'s own Drawer component), triggered by a hamburger control in the Header, below `md`.
- **Collapse toggle**: independent of the responsive breakpoint behavior above — an operator on a large screen may still manually collapse the sidebar to the icon-only rail (persisted to `localStorage`, restored on next visit) for more workspace room. This is genuinely local UI state, per `ADR-0005`'s Zustand decision, not server state.

---

## 5. Breadcrumbs

Derived automatically from the current route's own React Router route configuration (each route declares a `breadcrumb` label in its route object), never hand-maintained per screen. The last breadcrumb segment is never a link (it is the current page); every prior segment is.

---

## 6. Route Transitions & Loading

- **Route-level code splitting**: every module's own route tree is a separate lazy-loaded chunk (`React.lazy` + Vite's own dynamic `import()`), per `docs/frontend/PERFORMANCE_FOUNDATION.md` — navigating from Orders to Catalog for the first time in a session downloads Catalog's own bundle only at that moment, not upfront.
- **Loading overlay**: while a lazy route chunk (or its own initial data fetch, via TanStack Query's `isLoading`) is in flight, the routed content region shows a `Skeleton`-based loading state (`docs/frontend/DESIGN_SYSTEM.md` §2) scoped to that region only — the Header and Sidebar never re-render or flash during a route change, since they are outside the `<Outlet />` entirely.
- **Transition animation**: a `motion.duration.default` (200ms) opacity cross-fade on the routed content region only, respecting `prefers-reduced-motion` (`docs/frontend/DESIGN_SYSTEM.md` §1.7) by skipping the animation entirely rather than reducing it.

---

## 7. Session Restore

On application boot (a hard page reload, or first visit with an existing token in storage):

1. The Sanctum bearer token (`ADR-0005`) is read from persistent storage (`localStorage`, since the admin interface has no server-rendering step that would benefit from a cookie — a deliberate, explicit choice, not an oversight, and consistent with the backend's own bearer-token-only design confirmed during Phase 1.1's hardening pass).
2. If present, `apps/admin` calls `GET /api/v1/auth/me` (already real) before rendering any authenticated route — this both validates the token is still live (an expired/revoked token gets a clean `401`, per Phase 1.1's own `redirectGuestsTo` fix, routing the operator back to login rather than a broken half-authenticated state) and populates the operator's own permission set for the Sidebar's permission-aware rendering in §4.
3. While this check is in flight, the entire application shows a single, full-screen loading state (not the AdminShell's own scoped overlay from §6) — there is no "flash of navigation the operator isn't permitted to see" possible, since the Sidebar never renders before the permission set is known.
4. A failed check clears the stored token and redirects to login, carrying the originally-requested URL as a return-to parameter so a bookmarked deep link survives a re-login.

---

## 8. Theme Integration

The Admin Shell's own chrome (Header, Sidebar, breadcrumbs) is themed identically to every other `packages/ui` component — no separate "shell theme," since the shell is not visually distinct from the modules it hosts, per §1's own "one coherent product" reasoning.

---

## 9. Explicitly Not Designed Here (Named So It Isn't Assumed Later)

Per Phase 2.0's own scope boundary ("This is NOT a Catalog implementation... those come later"):

- The actual results UI for global search (a command-palette-style dropdown/modal) — only the Header's placeholder trigger is specified.
- The actual notification panel UI — only the Header's placeholder trigger and unread-badge behavior are specified.
- Any module's own screen layouts, tables, forms, or data — those consume `packages/ui`'s components (`docs/frontend/DESIGN_SYSTEM.md`) but their own composition is each module's own Phase 2.1+ concern.
- Real multi-workspace/multi-store switching logic — placeholder only, per §3, pending the backend's own tenant-scoping design question (`ARCHITECTURE_REVIEW_PHASE1.md` B-10/B-15).
