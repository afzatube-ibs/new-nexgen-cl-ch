# ADR-0006: Storefront Rendering — Next.js

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-01 |
| **Related** | `03_SYSTEM_ARCHITECTURE.md` § `ARCH:TECHNOLOGY_DECISIONS`, `07_UI_DESIGN_SYSTEM.md`, `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`, `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md`, `docs/frontend/PERFORMANCE_FOUNDATION.md`, `ADR-0009` |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-01 | Drafted | Engineering Review complete — framework choice only (Next.js); every other stack decision left open pending Phase 2.0 |
| 2026-08-08 | Status changed to Accepted; Decision expanded to cover rendering strategy, styling, image handling, and testing | Same governance trigger as `ADR-0005` — Phase 2.0's architecture documents (`docs/frontend/THEME_ENGINE_ARCHITECTURE.md`, `STOREFRONT_COMPONENT_ENGINE.md`, `PERFORMANCE_FOUNDATION.md`) require a fully-settled stack to be written against |

## Context

The customer-facing storefront has different requirements than the admin interface: it must be discoverable by search engines and perform well for anonymous, first-time visitors, which favors server-side or hybrid rendering over a purely client-rendered single-page application.

Unlike the admin interface, the storefront's actual visual output is not fixed by this platform at all — `docs/frontend/THEME_ENGINE_ARCHITECTURE.md` establishes that a merchant's storefront is rendered by a swappable Theme Package, not a single hardcoded design. This ADR settles the rendering *engine* every theme runs on; it deliberately does not, and must not, encode any specific theme's own visual decisions.

## Decision

**Framework**: **Next.js** (App Router), communicating with the backend exclusively through the REST API (`ADR-0007`), independently deployable from both the backend and the admin interface.

**Rendering strategy**: a deliberate per-route mix, not one blanket choice —

- **Static Generation (SSG) with Incremental Static Regeneration (ISR)** for content that changes infrequently relative to traffic volume: product detail pages, category pages, CMS-authored landing pages (`docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`). Revalidation interval is a per-Section/per-page CMS configuration value (`docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`'s Scheduling concept), not a global constant, since a Flash Sale section's own freshness need is materially different from a static FAQ page's.
- **Server-Side Rendering (SSR)** for genuinely request-specific content: cart state, a logged-in customer's account pages, checkout.
- **Client-side rendering** only for interaction-local state layered on top of an already-rendered page (a Cart Drawer's open/closed state, a Product Grid's client-side filter interaction) — never for the initial, crawlable content of a page.

This mix is Next.js's own supported per-route model (`export const revalidate`, Server Components by default, `"use client"` opt-in), not a custom mechanism this platform builds — the Theme Engine (`docs/frontend/THEME_ENGINE_ARCHITECTURE.md`) is responsible for exposing this choice to a Theme Package per Section, not for reimplementing Next.js's own rendering primitives.

**Styling**: **Tailwind CSS**, consuming the same `packages/tokens` source as the admin interface (`ADR-0005`, `ADR-0009`) — one design-token source of truth, two independent Tailwind configurations built from it. A Theme Package may extend (never replace) the base token set with its own theme-specific values, per `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`'s override contract.

**Images**: **`next/image`**, Next.js's own built-in image optimization (automatic responsive `srcset` generation, lazy loading below the fold, modern format negotiation) — the concrete mechanism behind `docs/frontend/PERFORMANCE_FOUNDATION.md`'s image-optimization and responsive-image requirements, not a separate third-party image pipeline.

**Testing**: the same **Vitest + React Testing Library + Playwright** stack as the admin interface (`ADR-0005`) — one testing toolchain platform-wide, since nothing about component-behavior or end-to-end testing differs between the two applications' underlying needs, even though their rendering strategies do.

## Alternatives Considered

- **Client-side-only React application (same approach as the admin interface, `ADR-0005`).** Simpler to maintain as a single frontend pattern across both interfaces, but a purely client-rendered storefront has materially worse search-engine visibility and slower first-paint for anonymous customers, which is a direct cost to `PRINCIPLES:MERCHANT_FIRST` — the merchant's ability to be found and to convert visitors is a core operational need, not a developer convenience. Rejected.
- **Server-rendered storefront directly from the backend framework (same coupling concern as `ADR-0005`).** Rejected for the same modular-boundary reasoning as the admin interface decision.
- **Full SSR for every route, no SSG/ISR.** Simpler mental model (one rendering strategy, not three), but pays a real-time rendering cost on every request for content — most product and category pages — that changes far less often than it is viewed. Rejected as a poor default for a storefront's actual traffic shape (many anonymous reads per write), though any individual Theme Package remains free to choose SSR for a specific page if its own content genuinely warrants it.
- **A dedicated third-party image CDN/service instead of `next/image`.** A real option for very large catalogs, but adds an external dependency and a second image pipeline to reason about before Phase 1's actual Catalog/Media scale has ever demonstrated `next/image`'s own optimization is insufficient. Deferred, not rejected outright — named in `docs/frontend/PERFORMANCE_FOUNDATION.md` as a documented future extension point rather than built now, consistent with Phase 2.0's own "foundation, not every feature" instruction.

## Consequences

- The storefront and admin interface use different frontend approaches for reasons specific to their respective audiences and needs — this is a deliberate exception to `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`, justified because storefront and admin have genuinely different non-functional requirements (public discoverability vs. authenticated operator efficiency), not because a new pattern "felt more natural."
- Both frontends depend on the same REST API (`ADR-0007`), which is the actual point of consistency enforced across the platform.
- The per-route SSG/ISR/SSR mix means every future Theme Package author must understand which rendering mode applies to which kind of Section — `docs/frontend/THEME_ENGINE_ARCHITECTURE.md` is where that contract is made explicit, not left to each theme's own convention.
- `packages/tokens` being shared with the admin interface (`ADR-0009`) means a platform-wide token change (e.g. a brand color update) is a single-source edit that propagates to both applications' builds — the concrete mechanism, not merely the stated intent, behind `07_UI_DESIGN_SYSTEM.md`'s single design language.
- No storefront pages, themes, or CMS content exist as of this ADR's acceptance — this document settles the *engine*, per Phase 2.0's own explicit scope boundary; Phase 2.3 (Landing & Conversion Engine) and beyond is where real pages are built on top of it.
