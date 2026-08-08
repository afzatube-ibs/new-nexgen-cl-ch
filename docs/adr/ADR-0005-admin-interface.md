# ADR-0005: Admin Interface — React + TypeScript

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS`, `07_UI_DESIGN_SYSTEM.md`, `docs/frontend/DESIGN_SYSTEM.md`, `docs/frontend/ADMIN_SHELL_ARCHITECTURE.md`, `ADR-0009` |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-01 | Drafted | Engineering Review complete — framework choice only (React + TypeScript); every other stack decision left open pending Phase 2.0 |
| 2026-08-08 | Status changed to Accepted; Decision expanded to cover build tooling, styling, component primitives, state/data-fetching, forms, routing, testing, and charting | Phase 2.0 (Frontend Architecture & Design) requires a fully-settled stack before `docs/frontend/*` architecture documents — and, later, Phase 2.1's real implementation — can be written against it. `GOVERNANCE:COMPLETION_RULE`: Phase 2.1 cannot begin under a still-Draft ADR its own implementation depends on |

## Context

`PRINCIPLES:OPERATIONAL_ACCESSIBILITY` requires that operators can perform common tasks through the platform's own interface. The admin interface is a distinct application from the customer-facing storefront (`ADR-0006`), interacting with the backend only through the REST API (`ADR-0007`), consistent with `ADR-0001`'s modular boundary between backend and frontend concerns.

The admin interface is authenticated-only, never indexed by search engines, and used by staff who return to it daily — its non-functional priorities are interaction speed, type safety across a large and growing surface area (19 backend modules' worth of CRUD, workflow, and reporting screens), and long-term maintainability, not first-paint latency or SEO. This is the opposite non-functional profile from the storefront (`ADR-0006`), which is why the two deliberately diverge in rendering strategy.

## Decision

**Framework**: React 18+ with TypeScript, strict mode enabled (`"strict": true` in `tsconfig.json`, no exceptions per module) — per `PRINCIPLES:EXPLICIT_FAILURE`, a type error must surface at build time, never as a runtime failure an operator encounters mid-task.

**Build tool**: **Vite.** The admin interface is a pure client-side single-page application (no SSR requirement — unlike the storefront, per `ADR-0006`'s own reasoning) communicating only with the backend REST API, so Vite's dev-server speed and simpler configuration are a better fit than a framework carrying SSR machinery the admin interface will never use.

**Styling**: **Tailwind CSS**, driven by the design tokens `packages/tokens` (`ADR-0009`) defines once, consumed identically by both the admin interface and the storefront — the concrete mechanism that keeps `07_UI_DESIGN_SYSTEM.md`'s single design language real across two independently-deployed applications rather than two Tailwind configs drifting apart by hand.

**Component primitives**: **Radix UI** (unstyled, accessibility-first primitives — dialogs, dropdowns, tooltips, popovers, tabs, etc.) as the behavioral foundation `packages/ui`'s own styled component library (`docs/frontend/DESIGN_SYSTEM.md`) is built on top of. Radix owns keyboard navigation, focus management, and ARIA semantics for every interactive primitive it provides — `07_UI_DESIGN_SYSTEM.md`'s accessibility requirements (keyboard navigation, focus states) are satisfied by construction for any component built on a Radix primitive, not re-implemented per component.

**Icons**: **Lucide** — a single, consistent, tree-shakeable icon set for the whole platform (admin and storefront both), avoiding the "three different icon styles across the product" failure mode a per-team, per-feature icon choice invites.

**Server state / data fetching**: **TanStack Query.** Every admin screen's data originates from the backend REST API (`ADR-0007`) — TanStack Query owns caching, request de-duplication, background refetch, and optimistic-update patterns against that API, so no module reinvents its own fetch-and-cache logic.

**Client/UI state**: **Zustand**, for state that is genuinely local to the browser session and not server data (sidebar collapsed/expanded, active workspace, theme preference before it round-trips to a user preference API). Deliberately not Redux — the admin interface's actual state-management need, once server state is TanStack Query's responsibility, is small enough that Redux's boilerplate would be solving a problem this application does not have.

**Forms**: **React Hook Form + Zod.** Zod schemas double as the single source of truth for a form's shape and its validation rules, and are written to mirror each backend module's own `Http\Requests\*Request` validation rules (`docs/frontend/DESIGN_SYSTEM.md`'s Forms section) — a client-side validation failure and the equivalent server-side `422` should always agree, never surprise an operator with a mismatch.

**Routing**: **React Router (v6+).** Chosen over TanStack Router specifically for `PRINCIPLES` alignment with a platform meant to "survive 10+ years": React Router is the most battle-tested, widest-adopted React router, with the lowest risk of the library itself becoming unmaintained over that horizon. TanStack Router's stronger compile-time type safety was a genuine, seriously-weighed alternative (see below) but was not judged to outweigh React Router's maturity and ecosystem depth for a decision this costly to reverse later.

**Testing**: **Vitest** (unit/component, Vite-native, fast) + **React Testing Library** (component behavior, user-centric queries rather than implementation-detail assertions) + **Playwright** (end-to-end, real-browser verification of the admin shell and critical workflows).

**Charts**: **Recharts** as the low-level primitive `packages/ui`'s own `Chart` component (`docs/frontend/DESIGN_SYSTEM.md`) wraps — chosen over a pre-styled dashboard chart kit specifically so this platform owns the actual visual design (consistent with every other component in the system being genuinely reusable and on-brand, not a third party's own aesthetic bolted on).

## Alternatives Considered

- **Server-rendered admin views (generated directly by the backend framework).** Simpler initially, but tightly couples the admin interface's release cycle to the backend's, working against the modular boundary `ADR-0001` establishes and making the admin interface harder to iterate on independently. Rejected.
- **Next.js for the admin interface too** (one framework for both frontends). Rejected: the admin interface has no SSR/SEO requirement at all, and adopting Next.js's App Router, server components, and hydration model purely for consistency with the storefront would import real complexity (build config, server-component/client-component boundary reasoning, an actual Node server to run) with no corresponding benefit for a pure authenticated SPA. `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` argues for one pattern *unless the two contexts have genuinely different needs* — exactly the same reasoning `ADR-0006` already used to justify the admin/storefront framework split in the first place.
- **TanStack Router instead of React Router.** TanStack Router's file-based, fully-type-inferred routing (route params, search params, and loader data all flow through TypeScript without manual typing) is a real, meaningful improvement over React Router's own, weaker typing story. Weighed seriously and rejected only on maturity/longevity grounds — React Router has a much longer track record and a larger ecosystem of maintained integrations. This is the one Admin decision most likely to be revisited if TanStack Router's own maturity profile changes materially before Phase 2.1 implementation begins; recorded here explicitly so that reconsideration is a deliberate ADR amendment, not a silent drift.
- **Redux (or Redux Toolkit) for state management.** Rejected: once server state lives in TanStack Query, the actual client-only state surface is small, and Redux's action/reducer/selector boilerplate is a worse fit for that smaller surface than Zustand's minimal API.
- **CSS Modules or styled-components instead of Tailwind.** Both are legitimate, but neither has Tailwind's ecosystem alignment with Radix-based, shadcn-style component libraries — the specific "own the code, unstyled behavior primitives plus utility CSS" pattern this ADR's component-primitives decision already commits to. Introducing a second styling paradigm alongside that pattern would be inconsistent for no benefit.
- **Material UI, Ant Design, or another fully-styled component kit.** Rejected: a fully-styled kit imposes its own visual identity, fighting `07_UI_DESIGN_SYSTEM.md`'s own design language rather than expressing it — exactly the "unreusable, not genuinely ours" outcome Phase 2.0's own instruction ("no shortcuts... everything reusable") was written to avoid.

## Consequences

- TypeScript's static typing supports `PRINCIPLES:EXPLICIT_FAILURE` at the interface layer — type errors surface at build time rather than as runtime failures encountered by an operator.
- The admin interface has no direct access to the datastore or any backend-internal state; every capability it offers an operator must exist as a documented API capability (`ADR-0007`), which is itself a forcing function for `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` and the later `06_API_STANDARD.md`.
- Every one of the tooling decisions above is now a real dependency this platform commits to maintaining for years, not a placeholder — `docs/frontend/DESIGN_SYSTEM.md` and `docs/frontend/ADMIN_SHELL_ARCHITECTURE.md` are written directly against this stack, and Phase 2.1's real implementation inherits it without re-litigation.
- Radix UI + Tailwind + `packages/tokens` together are the concrete mechanism that makes `07_UI_DESIGN_SYSTEM.md`'s accessibility and theming requirements checkable in code review, not only stated in policy.
- No OpenAPI schema exists yet for the backend's ~150 endpoints (`ARCHITECTURE_REVIEW_PHASE1.md` finding B-5) — `packages/api-client` (`ADR-0009`) is hand-maintained until one does, a known, accepted, and named debt rather than a silent gap.
