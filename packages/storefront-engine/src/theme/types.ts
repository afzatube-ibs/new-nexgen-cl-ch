/**
 * The Theme Engine's own resolution contract — a direct TypeScript port of
 * docs/frontend/THEME_ENGINE_ARCHITECTURE.md §2.3 (the `ThemePackage`
 * interface itself), §6 (`ThemeTemplate` — the Templates layer above
 * Sections), §8 (`supportsDarkMode`), and §9 (`extends`, child-theme
 * inheritance). This file is the "theme engine" as a technical artifact,
 * exactly as that document's own §2.3 states — everything else in this
 * package exists to make this one contract meaningful and enforceable.
 *
 * No Theme Package exists yet (THEME_ENGINE_ARCHITECTURE.md §2.4 — "Phase
 * 2.3+ scope"). Beta Milestone 1 ships zero designed themes; every page
 * renders through `theme/defaultTemplates.ts` + `engine/primitiveRegistry.ts`'s
 * own plain fallback implementations, per §3 step 4's "always renders
 * something" guarantee.
 */

/**
 * The Storefront Component Engine's own primitive inventory
 * (docs/frontend/STOREFRONT_COMPONENT_ENGINE.md §2). Beta Milestone 1 ships
 * real default implementations for the subset this milestone's own routing
 * scope actually needs (Home/Category/Brand/Product) — every other name is
 * a real, typed contract member today, with no implementation behind it
 * yet, exactly like `THEME_ENGINE_ARCHITECTURE.md §2.4`'s own "contract
 * before implementation" precedent for the theme system as a whole.
 */
export type StorefrontPrimitiveName =
  | 'Hero'
  | 'Banner'
  | 'ProductGrid'
  | 'CategoryGrid'
  | 'BrandSlider'
  | 'FlashSale'
  | 'Countdown'
  | 'TrustBar'
  | 'Newsletter'
  | 'Testimonials'
  | 'FAQ'
  | 'StickyBuyBar'
  | 'ProductCard'
  | 'CartDrawer'
  | 'UpsellBlock'
  | 'CrossSellBlock'
  | 'RecentlyViewed'
  | 'RecommendedProducts';

/** A CMS `Section` archetype value — `THEME_ENGINE_ARCHITECTURE.md` §2.3's `SectionType`. Aliased to the primitive name it renders through, since no CMS backend exists yet (M2, not this milestone) to define a distinct Section-type vocabulary of its own. */
export type SectionType = StorefrontPrimitiveName;

/** One node in a page's own content tree — `CMS_FOUNDATION_ARCHITECTURE.md`'s Section shape, narrowed to what the Storefront Engine actually needs to resolve and render it. */
export interface Section {
  type: SectionType;
  /** Schema-validated per-Section configuration (CMS_FOUNDATION_ARCHITECTURE.md §3) — opaque to the engine itself, passed through to whichever component resolves `type`. */
  configuration: Record<string, unknown>;
  /** A stable key for React reconciliation and for future split-testing (`LANDING_ENGINE_ARCHITECTURE.md` §3.4) — not currently used for variant assignment in this milestone. */
  key?: string;
}

/** `THEME_ENGINE_ARCHITECTURE.md` §6 — a named, ordered default arrangement of Sections for one page archetype, owned by a Theme, not by CMS. */
export interface ThemeTemplate {
  archetype: 'homepage' | 'product-detail' | 'category-listing' | 'collection-listing' | 'brand-listing' | 'search-results' | 'cart' | 'blank';
  defaultSections: Section[];
}

/** `THEME_ENGINE_ARCHITECTURE.md` §2.3's own `DesignTokens` override shape — intentionally loose (`Record<string, string>`) here since `@nexgen/tokens` is the real, typed source of truth this narrows; a theme may only supply string values for token names that already exist there, enforced at the point a token is actually consumed (CSS custom properties), not by this type alone. */
export type ThemeTokenOverrides = Record<string, string>;

/** `THEME_ENGINE_ARCHITECTURE.md` §2.3 — the full `ThemePackage` contract, extended by §6 (templates), §8 (dark mode), §9 (inheritance). */
export interface ThemePackage {
  /** A unique, stable theme identifier — e.g. "nexgen-default". */
  id: string;

  /** Maps a primitive name to this theme's own React component implementing it. A theme MAY omit an entry — the Storefront Engine falls back to this package's own default implementation (`engine/primitiveRegistry.ts`) rather than failing to render the Section at all. */
  components: Partial<Record<StorefrontPrimitiveName, unknown>>;

  /** Token overrides layered on top of `@nexgen/tokens`' own base values — additive only, never a new token category (§4's own "additive, never structural" rule). */
  tokens?: ThemeTokenOverrides;

  /** Which rendering mode this theme requests per Section type, if it needs to differ from the Storefront Engine's own sensible default. Not exercised in this milestone — every route's rendering mode is fixed by `STORE_FRONTEND_ARCHITECTURE.md` §2's own table, not per-theme. */
  renderingHints?: Partial<Record<SectionType, 'ssg' | 'ssr'>>;

  /** `THEME_ENGINE_ARCHITECTURE.md` §6 — this theme's own default Section arrangement per page archetype. */
  templates: Partial<Record<ThemeTemplate['archetype'], ThemeTemplate>>;

  /** `THEME_ENGINE_ARCHITECTURE.md` §8 — a theme may declare it does not support dark mode at all; defaults to `true`. */
  supportsDarkMode?: boolean;

  /** `THEME_ENGINE_ARCHITECTURE.md` §9 — another `ThemePackage`'s own `id`, this theme's parent. Not exercised in this milestone (no child theme exists yet); the field exists so a future child theme is an additive change to this contract's own consumer, not a redesign. */
  extends?: string;
}
