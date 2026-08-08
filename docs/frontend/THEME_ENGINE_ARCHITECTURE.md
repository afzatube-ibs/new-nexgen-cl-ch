# neXgen Core — Theme Engine Architecture

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-08 |
| **Phase** | 2.0 — Frontend Architecture & Design (architecture only — no theme, no engine code, exists yet) |
| **Package** | `packages/storefront-engine`, consumed only by `apps/storefront` (`ADR-0009`) |
| **Scope boundary** | This document builds **the engine that allows themes to exist and be swapped**. It does not build a theme. No visual design, no landing page, no storefront page of any kind is specified here — those are Phase 2.3+ (Landing & Conversion Engine) and beyond. |

---

## 1. Why This Has To Be an Engine, Not a Hardcoded Storefront

`ADR-0006` establishes that the storefront's own visual output is not fixed by this platform — a merchant must eventually be able to install, configure, and swap a Theme Package the same way a Shopify or WooCommerce merchant does, without a code deployment. Building the storefront as one hardcoded Next.js application with the merchandising logic and the visual design tangled together would make that goal impossible to retrofit later without a rewrite. This document exists specifically to prevent that outcome — it defines the seams *now*, while no theme yet exists to accidentally couple to them.

---

## 2. The Four Layers

```
Core
  ↓ hosts
Storefront Engine
  ↓ interprets CMS content through
Theme Engine
  ↓ resolves each Section/Block to a component supplied by
Theme Packages
```

### 2.1 Core (`apps/storefront`)

The Next.js application shell itself: routing, data-fetching against the backend's REST API (`ADR-0007`, via `packages/api-client`), authentication state for a logged-in customer, cart state, and the App Router's own request lifecycle. The Core has **zero merchandising or visual opinions** — it does not know what a "Hero" is, does not import any Theme Package, and does not render any Section directly. Its only responsibility toward theming is: resolve the active Theme Package for the current store, and hand rendering control to the Storefront Engine.

### 2.2 Storefront Engine (`packages/storefront-engine`)

The CMS-content interpreter (`docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`'s own Sections/Blocks/Widgets model). Given a page's own CMS-authored content tree (an ordered list of Sections, each with a `type` and a `configuration` payload matching that type's own Schema), the Storefront Engine walks the tree and, for each Section, asks the active Theme (§2.3) to resolve that `type` to a real React component. The Storefront Engine itself renders **no visual output of its own** — it is purely the tree-walking, schema-validating, and component-resolution logic. This is the same separation-of-concerns discipline the backend's own `Engines\SearchEngineContract` (Search module) or `Gateways\Contracts\PaymentGatewayContract` (Payments module) already apply: an abstraction with real behavior, owning no business-specific content itself.

### 2.3 Theme Engine (the resolution contract, still inside `packages/storefront-engine`)

The actual **contract** a Theme Package must satisfy — not a separate package, but the interface `packages/storefront-engine` defines and every Theme Package implements:

```ts
interface ThemePackage {
  /** A unique, stable theme identifier — e.g. "nexgen-default" */
  id: string;

  /** Maps a Storefront Component Engine primitive name (docs/frontend/
   *  STOREFRONT_COMPONENT_ENGINE.md's own inventory — "Hero", "ProductGrid",
   *  "Banner", ...) to this theme's own React component implementing it.
   *  A theme MAY omit an entry; the Storefront Engine falls back to
   *  packages/ui's own default, unstyled-but-functional implementation of
   *  that primitive rather than failing to render the Section at all —
   *  the same "explicit failure, but never a broken page" principle the
   *  backend's own PRINCIPLES:EXPLICIT_FAILURE applies to a caught error. */
  components: Partial<Record<StorefrontPrimitiveName, ComponentType<any>>>;

  /** Token overrides layered on top of packages/tokens' own base values
   *  (docs/frontend/DESIGN_SYSTEM.md §1) — a theme may override color/
   *  typography/spacing tokens, but the TOKEN NAMES are fixed by
   *  packages/tokens; a theme cannot invent a new token category, only
   *  supply its own values for the ones that already exist. */
  tokens?: Partial<DesignTokens>;

  /** Which rendering mode (ADR-0006 §Rendering strategy) this theme
   *  requests per Section type, if it needs to differ from the Storefront
   *  Engine's own sensible default (SSG/ISR for most Sections). */
  renderingHints?: Partial<Record<SectionType, 'ssg' | 'ssr'>>;
}
```

This interface is the entire "theme engine" as a technical artifact — everything else (§2.2, §2.4) exists to make this one contract meaningful and enforceable.

### 2.4 Theme Packages (not built in Phase 2.0)

An actual installable package (its own `packages/themes/<name>` workspace member, or, once a real marketplace exists, an externally-published npm package following the same `ThemePackage` contract) implementing real, designed components for some or all Storefront Component Engine primitives. **No Theme Package exists yet** — Phase 2.0 builds only the contract in §2.3 and the two layers that make it real (§2.1, §2.2). The platform's own first theme (`nexgen-default`, or similar) is explicitly Phase 2.3+ scope.

---

## 3. Theme Resolution at Request Time

1. The Core (§2.1) determines the active store for the current request (today: the single default store, per the backend's own single-tenant Phase 1 scope — `ARCHITECTURE_REVIEW_PHASE1.md` B-10/B-15; this resolution step is where a future multi-store lookup would live, without changing anything below it).
2. The Core looks up that store's configured `ThemePackage.id` (a Store Configuration concern — the backend's `Store` model, Phase 1, already exists as the natural owner of this setting once a real "active theme" field is added to it; **not added in Phase 2.0**, named here as the concrete, small, additive backend touch-point Phase 2.1 or 2.2 will need, per this Phase's own "except where absolutely required for frontend integration" allowance).
3. The resolved `ThemePackage` is passed into the Storefront Engine (§2.2), which uses it for every Section on the page being rendered.
4. If no theme is configured (the expected state until Phase 2.3 ships a real one), the Storefront Engine renders every Section using `packages/ui`'s own default primitive implementations — a real, functional, unstyled-but-usable storefront, never a blank page or a build failure. This "always renders something" guarantee is deliberate and tested from Phase 2.1 onward.

---

## 4. What Makes a Theme Safe to Swap

- **No Theme Package may import from another Theme Package**, `apps/storefront`'s own Core, or any backend code directly — a theme's only inputs are the `ThemePackage` contract (§2.3) and the CMS content payload the Storefront Engine hands it per Section. This is `ADR-0009`'s own package-boundary rule applied one layer further: the boundary an ESLint rule enforces at the `apps/*` ↔ `packages/*` line applies equally at the Theme-Package ↔ everything-else line once Theme Packages exist.
- **No Theme Package may fetch data of its own.** A Section component receives its own `configuration` (from CMS) and any product/category/order data the Storefront Engine already fetched and passed down as props — a theme never calls the backend API directly, or a merchant's own theme customization becomes a security and data-boundary risk `06_API_STANDARD.md`'s own authentication/authorization model was never designed to be re-validated inside untrusted theme code.
- **Token overrides are additive, never structural** — see §2.3's own contract note. A theme can make everything blue; it cannot invent a fifth semantic color category `packages/ui`'s components don't already know how to consume.

---

## 5. Relationship to the CMS Foundation and Storefront Component Engine

This document defines *how* a Section's content becomes a rendered component. `docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md` defines *what a Section, Block, and Widget actually are* and how a merchant configures one. `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md` defines *the actual inventory of primitive names* (`"Hero"`, `"ProductGrid"`, etc.) a `ThemePackage.components` map may provide entries for. All three documents describe one coherent system; none is meaningful read in isolation.
