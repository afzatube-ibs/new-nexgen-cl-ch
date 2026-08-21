# neXgen Core — Theme Engine Architecture

| Field | Value |
|---|---|
| **Status** | §§1–5: **Accepted** (2026-08-08, unchanged by this revision). §§6–10: **Draft — Proposed, pending Product Owner review** (added 2026-08-17, per `GOVERNANCE:CHANGE_MANAGEMENT` — a genuine extension, not a silent rewrite of the Accepted original) |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-08 (original); extended 2026-08-17 |
| **Phase** | 2.0 (§§1–5, Accepted) / Pre-2.2 Customer Experience Platform architecture pass (§§6–10, Draft) |
| **Package** | `packages/storefront-engine`, consumed only by `apps/storefront` (`ADR-0009`) |
| **Scope boundary** | This document builds **the engine that allows themes to exist and be swapped**. It does not build a theme. No visual design, no landing page, no storefront page of any kind is specified here — those are Phase 2.3+ (Landing & Conversion Engine) and beyond. |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-08 | Initial version — §§1–5 (Four Layers, Theme Resolution, Swap Safety, Relationship to CMS/Component Engine). Accepted | Phase 2.0 Frontend Architecture & Design |
| 2026-08-17 | Added §6 (Templates — the "Theme → Templates → Sections → Blocks → Widgets" hierarchy the original §2 named only down to Sections), §7 (Design Token Hierarchy — Global Variables → Typography/Spacing/Color/Layout/Responsive/Animations, naming how a theme's token surface composes with `DESIGN_SYSTEM.md` §1), §8 (Dark Mode & Brand Themes), §9 (Child Themes & Theme Inheritance), §10 (Future Marketplace Support) | Pre-2.2 "Customer Experience Platform" architecture pass — the Product Owner's own instruction named a fuller hierarchy ("Theme → Templates → Sections → Blocks → Widgets → Design Tokens → Global Variables → Typography → Spacing → Color System → Layout → Responsive Rules → Animations → Component Library") and named Dark mode/Brand themes/Child themes/Theme inheritance/Future marketplace support explicitly, none of which the original 2026-08-08 version covered. §§1–5 are unmodified; nothing below contradicts them |

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

---

## 6. Templates — The Layer Above Sections

**Draft, 2026-08-17.** §2's four layers stop at "Theme Engine resolves a Section to a component." They deliberately said nothing about *which Sections, in what order, exist on a page of a given kind by default* — that gap is real, and it is what a **Template** fills.

A Template is a **named, ordered default arrangement of Section types for one page archetype** (`homepage`, `product-detail`, `category-listing`, `cart`, `search-results`, ...), owned by a Theme Package, not by CMS:

```ts
interface ThemeTemplate {
  archetype: 'homepage' | 'product-detail' | 'category-listing' | 'collection-listing'
           | 'brand-listing' | 'search-results' | 'cart' | 'blank';
  defaultSections: Array<{ type: StorefrontPrimitiveName; configuration: unknown }>;
}

interface ThemePackage {
  // ...§2.3's existing fields, unchanged...
  templates: Partial<Record<ThemeTemplate['archetype'], ThemeTemplate>>;
}
```

**Why this is a Theme-owned concept, not a CMS one**: `CMS_FOUNDATION_ARCHITECTURE.md` §2 already defines a `Page`'s own Section list as merchant-authored, per-Page content. A Template is what a *new* Page of a given archetype starts from before a merchant has customized anything — the same relationship a word processor's "blank document template" has to the document a person then edits. A merchant is always free to add, remove, or reorder Sections on their own Page after creation; the Template only supplies the starting arrangement, and only when a Page is first created against that archetype. This is why Templates belong to the Theme (a design decision, `THEME_ENGINE_ARCHITECTURE.md`'s own domain) and not to CMS (a content-ownership decision) — swapping a theme is allowed to change what a *new* Page starts from; it must never retroactively rearrange an already-authored Page's own Sections, which would violate `UI:THEME_SYSTEM`'s "a theme changes presentation, never... information architecture" rule if a Template swap were allowed to silently reorder existing merchant content.

**Fallback**: a `blank` archetype (an empty Section list) is always available and is the Storefront Engine's own default when a Theme Package supplies no Template for a requested archetype — consistent with §3 step 4's existing "always renders something" guarantee, extended from individual Sections to whole Templates.

---

## 7. Design Token Hierarchy — Global Variables Through Component Library

**Draft, 2026-08-17.** §2.3's `tokens?: Partial<DesignTokens>` field is a theme's *override* surface — this section names the full hierarchy that field sits inside, since the original version left "Design Tokens → Global Variables → Typography → Spacing → Color System → Layout → Responsive Rules → Animations → Component Library" implicit rather than stated as a hierarchy.

```
packages/tokens (DESIGN_SYSTEM.md §1 — Global Variables, the base layer)
  → Color System (§1.1), Typography (§1.2), Spacing (§1.3),
    Elevation (§1.4), Border Radius (§1.5), Breakpoints (§1.6 — "Responsive Rules"),
    Motion (§1.7 — "Animations")
  ↓ overridden (additively — §4's existing rule) by
ThemePackage.tokens (§2.3)
  ↓ consumed by
packages/ui Component Library (DESIGN_SYSTEM.md §2)
  ↓ composed into
Storefront Component Engine primitives (STOREFRONT_COMPONENT_ENGINE.md §2)
```

Nothing here is a new mechanism — `DESIGN_SYSTEM.md` §1 already defines every token category named above, in full, with real values; §2 already defines the Component Library those tokens feed. What was missing, and what this section supplies, is the explicit statement that a Theme Package's token override (§2.3) sits at exactly one point in that chain — between the base `packages/tokens` values and every component that consumes them — never bypassing the Component Library to restyle a primitive directly (which would reintroduce the per-component `dark:`-class-audit failure mode `DESIGN_SYSTEM.md` §3 already rejects). **Layout** (page-level grid/composition, as opposed to `UI:GRID_LAYOUT`'s already-token-governed column/gutter system) is deliberately *not* an overridable token — a Theme Package expresses layout entirely through which Sections/Templates (§6) it composes and how its own components arrange their children, never through a platform-wide "layout token" this document does not define, since `UI:GRID_LAYOUT`'s shared grid structure is Core/Stable and a per-theme layout override would fragment it exactly the way `UI:THEME_SYSTEM` already forbids.

---

## 8. Dark Mode & Brand Themes

**Draft, 2026-08-17.**

- **Dark mode** is not a separate mechanism from §2.3's `tokens` override — it is `packages/tokens`' own existing light/dark pair (`DESIGN_SYSTEM.md` §1.1's Light mode/Dark mode columns) applied storefront-side exactly as `DESIGN_SYSTEM.md` §3 already specifies for the admin interface, with one storefront-specific addition: **a Theme Package may declare it does not support dark mode at all** (`supportsDarkMode: boolean` on `ThemePackage`, defaulting `true`) — unlike the admin interface (an internal tool where dark mode is always offered), a merchant's brand identity may be genuinely light-only, and forcing a dark variant on a theme that never designed one would produce exactly the kind of unreviewed, ad-hoc-contrast outcome `UI:COLOR_SYSTEM`'s accessibility requirement exists to prevent. When `supportsDarkMode: false`, the storefront's theme toggle (if the Theme Package chooses to render one — see `PERFORMANCE_FOUNDATION.md` §8's note that a Theme Package "may offer" a preference) is simply absent for that store, never present-but-broken.
- **Brand themes** — a merchant's own primary/accent color, logo, and font selection — are §2.3's `tokens` override applied to exactly the semantic roles `DESIGN_SYSTEM.md` §1.1 already names (`color.brand.default/.hover/.active` at minimum) plus a new, additive `brand.logo`/`brand.wordmark` asset reference (a Media-module asset identifier, per `MODULE:MEDIA`, never a raw URL) — no new token *category*, only real values supplied for tokens that already exist, per §2.3's own "additive, never structural" rule. A brand theme is therefore not architecturally distinct from any other theme override; the term describes *how a merchant uses* the same `tokens` field, not a second mechanism.

---

## 9. Child Themes & Theme Inheritance

**Draft, 2026-08-17.** Not built in any phase named so far — this section commits to the *shape* now so a real implementation is additive later, matching this document's own §2.4 precedent ("no Theme Package exists yet... Phase 2.3+ scope").

```ts
interface ThemePackage {
  // ...existing fields...
  extends?: string; // another ThemePackage's own `id` — this theme's parent
}
```

Resolution rule: a child theme's own `components`, `tokens`, and `templates` (§6) maps are shallow-merged **on top of** the parent's resolved maps — a child may override one Section's component, one token value, or one Template's default arrangement without redeclaring everything the parent already supplies, the same "override only what differs" discipline `CMS_FOUNDATION_ARCHITECTURE.md` §6 already applies to per-locale content overlays. A child theme's `extends` chain must be acyclic and is resolved once, server-side, at theme-lookup time (`THEME_ENGINE_ARCHITECTURE.md` §3 step 2) — never re-resolved per-request, so a broken or circular parent reference fails fast at deployment/configuration time, not silently per page load, per `PRINCIPLES:EXPLICIT_FAILURE`.

This is the concrete mechanism that lets a merchant (or a future theme marketplace vendor, §10) start from `nexgen-default` and override only a handful of Sections for their own brand, rather than forking the entire theme's source — directly serving `VISION:NON_GOALS`'s rejection of customization that requires unrestricted core modification, applied to theme customization specifically.

---

## 10. Future Marketplace Support

**Draft, 2026-08-17, named as a future extension point — not built, not scheduled to any phase in `IMPLEMENTATION_MASTER_PLAN.md`.**

Every design decision in §§2–9 was already made with this in mind, not retrofitted:

- A `ThemePackage` is a plain, self-contained object satisfying one exported TypeScript contract (§2.3) — nothing about it assumes it was authored inside this repository. §4's "no Theme Package may import from another Theme Package, the Core, or backend code directly" rule is precisely the sandboxing boundary a third-party-authored theme would need to be safe to install *before* any marketplace review process exists to vet it by hand.
- §9's inheritance model is what lets a marketplace theme meaningfully extend `nexgen-default` (or any other published theme) instead of every theme reimplementing every primitive from zero — a real adoption barrier for third-party theme developers on other platforms this document's own competitive framing (`LANDING_ENGINE_ARCHITECTURE.md`) treats as a mistake to avoid repeating.
- The concrete remaining gaps to an actual marketplace — package distribution/versioning (`packages/themes/<name>` today; an external npm-or-equivalent registry later, per §2.4's own "once a real marketplace exists" note), a review/certification process, licensing/payout — are genuinely out of a *frontend architecture* document's scope and are named here only so `NEXTGEN_FRONTEND_MASTER_PLAN.md`'s own Future Theme Marketplace section has a concrete architectural foundation to point back to, not a decision this document is making.

---

End of Document
