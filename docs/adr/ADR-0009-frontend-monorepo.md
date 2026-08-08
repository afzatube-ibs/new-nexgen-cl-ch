# ADR-0009: Frontend Monorepo & Shared Package Strategy

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-08 |
| **Related** | `ADR-0001` (modular monolith — this ADR is that same boundary-discipline applied to the frontend), `ADR-0005`, `ADR-0006`, `docs/frontend/*` |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-08 | Drafted and Accepted together | Phase 2.0 (Frontend Architecture & Design). No prior ADR settled how `apps/admin` and `apps/storefront` (`ADR-0005`, `ADR-0006`) share code — this is the missing piece every `docs/frontend/*` architecture document depends on |

## Context

`ADR-0005` and `ADR-0006` each settle one application's own framework. Neither settles how the two applications — independently deployable, per both ADRs' own text — share the things that genuinely must not diverge between them: design tokens, the component library built on those tokens, the typed API client against the backend's REST API, and common build/lint/test configuration. Phase 2.0's own instruction is explicit that "everything must be reusable" and "no duplicated components" — this is not achievable without a deliberate answer to *where shared code physically lives and how each app consumes it*, which is what this ADR settles.

This is the frontend expression of the same boundary discipline `ADR-0001` established for the backend: shared code lives in named, independently-versionable packages with an explicit public contract, never copy-pasted between `apps/admin` and `apps/storefront`, and never a hidden dependency one app has on the other's own internals.

## Decision

**Repository structure**: a single monorepo, npm workspaces, at the existing repository root (no new top-level repository) —

```
apps/
  backend/          (unchanged — Phase 1/1.1's existing Laravel application)
  admin/            (ADR-0005 — React + Vite, Phase 2.1)
  storefront/        (ADR-0006 — Next.js, Phase 2.2+)
packages/
  tokens/           (design tokens — the single source docs/frontend/DESIGN_SYSTEM.md specifies)
  ui/               (the component library — packages/tokens + Radix UI, per ADR-0005)
  api-client/       (typed REST client against the backend's API, ADR-0007)
  config/           (shared ESLint/TypeScript/Tailwind base configuration)
  storefront-engine/ (docs/frontend/THEME_ENGINE_ARCHITECTURE.md's rendering pipeline — storefront-only, not shared with admin)
```

**Workspace tool**: **npm workspaces** (native to npm, already the platform's confirmed-available package manager — no new tool to install or learn). Turborepo (or a similar task-orchestration layer) is a named, deliberately-deferred future addition once the number of packages and the cost of running every workspace's build/test/lint on every change actually justifies it — introducing it now, with two apps and four packages, would be solving a caching/parallelization problem that does not yet exist. This decision is explicitly revisitable without any package's own code changing, since it only affects *how* workspace scripts are orchestrated, never *what* each package exports.

**Package boundary rule** (the frontend's own version of `DATA:CROSS_MODULE_ACCESS`): a package under `packages/` may depend on another `packages/` package (e.g. `ui` depends on `tokens`), but an `apps/*` application may only depend on `packages/*` — never on another `apps/*` application directly. `apps/admin` and `apps/storefront` share code exclusively through named packages, never by importing from each other's own source tree. This is enforced the same way `deptrac.yaml` enforces the backend's module boundaries: an ESLint rule (`packages/config`'s own shared lint config, using `eslint-plugin-boundaries` or equivalent) makes a cross-`apps/*` import a build-time lint failure, not a documented-but-unenforced convention.

**Versioning**: every package under `packages/` is versioned together with the monorepo itself (a single version tag per release, not independent per-package semver) — appropriate because, unlike a published open-source library, no package under `packages/` is ever consumed outside this repository. This can be revisited if a package (most plausibly `packages/ui`) is ever extracted for reuse beyond this platform; not needed today.

**`packages/storefront-engine`'s own boundary**: consumed only by `apps/storefront`, never by `apps/admin` — the admin interface has no rendering pipeline, no Theme Package concept, and no CMS surface of its own (`docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md` is storefront-only). Naming it as its own package rather than folding it into `apps/storefront` directly is what lets `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`'s Core/Storefront-Engine/Theme-Engine/Theme-Package layering exist as real package boundaries, not merely a diagram.

## Alternatives Considered

- **Two entirely separate repositories** (`nexgen-admin`, `nexgen-storefront`), each with their own copy of shared primitives. Rejected outright — this is the literal "duplicated components" outcome Phase 2.0's own instruction was written to prevent, and it would require a manual, error-prone process to keep design tokens and the component library synchronized across repositories.
- **A single `packages/shared` catch-all** instead of the four named packages above. Rejected: an undifferentiated "shared" package accumulates unrelated concerns over time with no natural boundary to stop it (exactly the debt shape `MODULE:PUBLIC_CONTRACT`'s per-module-ownership reasoning exists to prevent on the backend) — naming `tokens`/`ui`/`api-client`/`config` separately means each has one clear responsibility and one clear reason to change.
- **Turborepo (or Nx) from day one.** A legitimate, commonly-recommended default for a frontend monorepo, and not rejected on principle — deferred specifically because this repository's actual current package count (two apps, four packages) does not yet have a caching/build-orchestration problem for it to solve. Revisiting this does not require moving any code; it only changes how workspace scripts are invoked.
- **pnpm or Yarn workspaces instead of npm.** Both offer stronger workspace-specific features (stricter dependency isolation, faster installs at very large scale) than npm workspaces. Rejected for now on the same "no tool this repository doesn't yet need" reasoning as Turborepo — npm is already confirmed present in every environment this platform's own tooling runs in, and introducing a second package manager purely for the frontend would be exactly the kind of "novelty over consistency" `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` warns against without the two frontend applications having demonstrated a real need for it.

## Consequences

- Every `docs/frontend/*` architecture document (`DESIGN_SYSTEM.md`, `ADMIN_SHELL_ARCHITECTURE.md`, `THEME_ENGINE_ARCHITECTURE.md`, `STOREFRONT_COMPONENT_ENGINE.md`, `CMS_FOUNDATION_ARCHITECTURE.md`, `PERFORMANCE_FOUNDATION.md`) is written assuming this exact package structure — Phase 2.1's real implementation begins from this layout, not a fresh one.
- A cross-`apps/*` import is a lint failure by construction, the same "catchable before it reaches production, not merely documented" property `ENGINEERING:DOMAIN_BOUNDARY_ENFORCEMENT` requires of the backend's own module boundaries.
- `packages/api-client` is hand-maintained until the backend gets an OpenAPI schema (`ARCHITECTURE_REVIEW_PHASE1.md` finding B-5, still open) — a named, accepted piece of debt, not a silent one; the day that schema exists, this package's own generation strategy is the natural place to adopt codegen without changing either application's own code.
- No `apps/admin` or `apps/storefront` directory, and no `packages/*` code, exists yet as of this ADR's acceptance — per Phase 2.0's own explicit "architecture and design documents only" scope, this ADR settles the structure Phase 2.1 stands up, without standing it up itself.
