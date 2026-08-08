# neXgen Core — Frontend Performance Foundation

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-08 |
| **Phase** | 2.0 — Frontend Architecture & Design (strategy and conventions only — no implementation exists yet, so nothing below is measured; every claim is a design commitment Phase 2.1+ implementation is accountable to, not a benchmark result) |
| **Applies to** | `apps/admin` (`ADR-0005`) and `apps/storefront` (`ADR-0006`) — their differing rendering strategies mean several items below apply differently, or not at all, to each; noted per item |

---

## 1. Lazy Loading & Code Splitting

- **Admin**: route-level splitting via `React.lazy` + Vite's dynamic `import()`, one chunk per module's own route tree (`docs/frontend/ADMIN_SHELL_ARCHITECTURE.md` §6) — an operator who never opens Notifications never downloads its code.
- **Storefront**: Next.js's own automatic per-route code splitting (App Router default), plus explicit `next/dynamic` for any genuinely below-the-fold, non-critical component (e.g. a `Testimonials` Section far down a long landing page) so it doesn't inflate the initial payload for content nobody may scroll to.
- **Shared rule**: `packages/ui` itself is tree-shakeable (named exports, no barrel file re-exporting the entire library as one object) — importing `Button` never pulls in `Table`'s own dependency graph.

## 2. Image Optimization & Responsive Images

- **Storefront**: `next/image` exclusively (`ADR-0006`) — automatic `srcset` generation, lazy loading below the fold, modern format negotiation (AVIF/WebP with fallback), and explicit `width`/`height` (or `fill` with a sized container) on every image to prevent cumulative layout shift.
- **Admin**: images are far less central (avatars, product thumbnails in a table row, brand logos) — plain `<img>` with explicit dimensions and `loading="lazy"` is sufficient; `next/image`'s own optimization pipeline is a storefront-specific need (public, SEO-relevant, high-traffic pages), not an admin one, so this is a deliberate asymmetry, not an inconsistency.

## 3. Route Prefetching

- **Storefront**: Next.js `<Link>`'s own default viewport-based prefetching (a link scrolled into view is silently prefetched) is used as-is — no custom prefetching logic is built, since Next.js's own default already satisfies this.
- **Admin**: React Router (`ADR-0005`) has no equivalent built-in; `packages/ui`'s own navigation components (Sidebar links, breadcrumbs) prefetch a route's lazy chunk on hover/focus (a short debounce, not on every render) — a real, deliberate implementation choice, not left unbuilt, since an operator's own navigation pattern (hovering toward a sidebar item before clicking) is a genuine, cheap prefetch signal.

## 4. Bundle Optimization

- Both apps: ES modules throughout, no CommonJS dependency permitted into `packages/*` (enforced by `packages/config`'s shared lint/build config) — tree-shaking only works reliably against ESM.
- **Admin (Vite)**: manual chunk splitting for large, rarely-changing vendor dependencies (React itself, Radix UI, TanStack Query) separate from application code, so a deploy that only changes application code doesn't invalidate the browser's cached vendor chunk.
- **Storefront (Next.js)**: relies on Next.js's own build-time bundle analysis and automatic vendor chunking — not reimplemented, since Next.js's own defaults are already tuned for this.
- **Both**: `packages/ui`'s own bundle size is tracked (a CI budget check, wired once Phase 2.1 stands up real CI for the frontend) — a budget regression on a shared package is a platform-wide cost, caught at the source rather than discovered later in either app's own build.

## 5. SSR Compatibility & Hydration Strategy

- **Admin has no SSR** (`ADR-0005`) — this section does not apply to it at all; a pure client-rendered SPA has no hydration mismatch class of bug to design against.
- **Storefront**: Next.js App Router's own Server Components are the default for every Section that has no client-side interactivity of its own (most of `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md`'s inventory — `Hero`, `Banner`, `ProductGrid`, `Testimonials`, `FAQ`'s own static content). `"use client"` is an explicit, narrow opt-in only for primitives with genuine client-side state or browser APIs — `Countdown` (a ticking clock — server-rendering a value that's stale the instant it reaches the browser would be actively wrong), `CartDrawer` (open/closed state, `localStorage`-backed cart), `StickyBuyBar` (scroll-position-aware). This narrow-opt-in discipline is what keeps the initial HTML payload and the JavaScript shipped to the browser both minimal — the opposite of marking whole pages `"use client"` by default and losing Server Components' own benefit entirely.

## 6. Future Cache Compatibility

- **Storefront**: every SSG/ISR page (`ADR-0006`'s own rendering-strategy mix) is, by construction, a static asset a CDN/edge cache can serve without hitting the Next.js server at all between revalidations — this is not a future capability to build, it is Next.js's own ISR output shape; the "future compatibility" this heading names is the *deployment topology* decision (fronting `apps/storefront` with a CDN/edge cache — Cloudflare, Vercel's own edge network, or equivalent), which is explicitly a Phase 2.2+ deployment concern, not a Phase 2.0 architecture one, and is named here only so it isn't forgotten when that phase's own deployment guide is written.
- **Admin**: no public caching applies (authenticated, per-operator content) — this heading is storefront-specific.

## 7. Object Storage Compatibility (Cloudflare R2)

The backend's own Media module (Phase 1) already supports an S3-compatible object storage backend via `AWS_*` environment variables (`config/filesystems.php`) — Cloudflare R2 is S3-API-compatible, so no backend change is required for R2 specifically; this is a deployment/configuration choice, not an architecture one. On the frontend side, `next/image`'s own remote-image support (`images.remotePatterns` in `next.config.js`) is configured to allow whatever origin Media assets are actually served from (the backend's own configured filesystem disk URL) — a configuration value, not hardcoded to any one provider, so switching from local disk to S3 to R2 requires no frontend code change.

## 8. Local Storage Compatibility

- **Admin**: sidebar-collapsed state, theme preference before it round-trips to a server-side preference (if one is ever added), and the Sanctum bearer token itself (`docs/frontend/ADMIN_SHELL_ARCHITECTURE.md` §7) — all genuinely client-only, ephemeral-per-browser state, appropriately in `localStorage` rather than requiring a server round-trip.
- **Storefront**: anonymous cart state (before/without a logged-in customer) and theme preference (if a Theme Package offers one, per `docs/frontend/DESIGN_SYSTEM.md` §3) — same reasoning. Cart state syncs to the backend's own Checkout module (Phase 1) once a customer authenticates or reaches checkout; `localStorage` is the anonymous-session bridge, never the system of record.

## 9. What This Document Does Not Cover

No performance *budget numbers* (target Lighthouse scores, target bundle-size ceilings in KB, target Time-to-Interactive) are set here — those require a real, built application to measure against, per this document's own header note. Setting numeric targets against zero lines of implementation code would be exactly the kind of unfounded claim `TESTING:PERFORMANCE_TESTING` (and this platform's own backend precedent — `PERFORMANCE_REVIEW.md`'s "no performance claim asserted from intuition" standard) argues against. Real budgets are Phase 2.1's own responsibility to set, once `apps/admin`'s first real build exists to baseline against.
