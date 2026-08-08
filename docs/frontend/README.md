# neXgen Core — Frontend Architecture Index

Phase 2.0's own deliverable set: the permanent architecture every future admin module and storefront module is built against. **Architecture and design documents only — no frontend code exists in this repository yet.** `apps/admin` and `apps/storefront` (`ADR-0005`, `ADR-0006`) are not scaffolded; `packages/*` (`ADR-0009`) does not exist on disk. Phase 2.1 (Admin Engine) is the first phase that writes real code against this foundation.

## Reading Order

1. **[`ADR-0005`](../adr/ADR-0005-admin-interface.md)** — Admin interface stack (React, Vite, Tailwind, Radix, TanStack Query, Zustand, React Hook Form + Zod, React Router, Vitest/RTL/Playwright, Recharts).
2. **[`ADR-0006`](../adr/ADR-0006-storefront-rendering.md)** — Storefront stack (Next.js, per-route SSG/ISR/SSR mix, `next/image`).
3. **[`ADR-0009`](../adr/ADR-0009-frontend-monorepo.md)** — How `apps/admin` and `apps/storefront` share code (`packages/tokens`, `packages/ui`, `packages/api-client`, `packages/config`, `packages/storefront-engine`), and the boundary rule between them.
4. **[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)** — Token values and the full component inventory (`packages/tokens`, `packages/ui`). Implements `docs/07_UI_DESIGN_SYSTEM.md`.
5. **[`ADMIN_SHELL_ARCHITECTURE.md`](ADMIN_SHELL_ARCHITECTURE.md)** — The permanent admin layout (header, sidebar, permission-aware nav, session restore) every module's own screens render inside.
6. **[`THEME_ENGINE_ARCHITECTURE.md`](THEME_ENGINE_ARCHITECTURE.md)** — The Core → Storefront Engine → Theme Engine → Theme Packages layering that makes the storefront's visual output swappable.
7. **[`STOREFRONT_COMPONENT_ENGINE.md`](STOREFRONT_COMPONENT_ENGINE.md)** — The reusable primitive inventory (Hero, ProductGrid, CartDrawer, ...) every theme resolves against.
8. **[`CMS_FOUNDATION_ARCHITECTURE.md`](CMS_FOUNDATION_ARCHITECTURE.md)** — Sections/Blocks/Widgets/Schemas — the content model the Storefront Engine interprets.
9. **[`PERFORMANCE_FOUNDATION.md`](PERFORMANCE_FOUNDATION.md)** — Lazy loading, code splitting, image optimization, SSR/hydration strategy, caching and storage compatibility.

## Relationship to the Rest of `docs/`

`docs/07_UI_DESIGN_SYSTEM.md` remains the authoritative, framework-agnostic design *philosophy* — this folder is its concrete, framework-specific implementation companion, never a replacement or a contradiction of it. Where this folder is silent, `07_UI_DESIGN_SYSTEM.md` governs. `ADR-0005`/`ADR-0006`/`ADR-0009` live in `docs/adr/` alongside every other numbered technology decision, per the existing ADR convention — this index links to them rather than duplicating their content.

## What Comes Next (Not This Phase)

| Phase | Scope |
|---|---|
| 2.1 — Admin Engine | Scaffold `apps/admin` and `packages/*` for real; implement `packages/ui`'s component inventory (§`DESIGN_SYSTEM.md`) and the Admin Shell (§`ADMIN_SHELL_ARCHITECTURE.md`) as real, tested code. First module screens (Users & Roles is the natural first, since Identity & Access is Phase 1's own foundational module) |
| 2.2 — Storefront Engine | Scaffold `apps/storefront`; implement the Storefront Engine and default primitive implementations (§`STOREFRONT_COMPONENT_ENGINE.md` §3) for real |
| 2.3 — Landing & Conversion Engine | The platform's first real Theme Package; real storefront pages composed from the primitive inventory; CMS persistence and (eventually) a visual editor, per `CMS_FOUNDATION_ARCHITECTURE.md` §7's own named-but-deferred scope |

Each phase begins only after Product Owner approval, per this project's own established `GOVERNANCE:COMPLETION_RULE` practice throughout Phase 1 and Phase 1.1.
