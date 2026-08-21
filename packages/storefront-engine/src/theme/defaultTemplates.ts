/**
 * The built-in default Template arrangement per page archetype —
 * `THEME_ENGINE_ARCHITECTURE.md` §6's own "blank archetype... always
 * available... the Storefront Engine's own default when a Theme Package
 * supplies no Template for a requested archetype" fallback, made concrete.
 *
 * No real Theme Package exists yet (M3, a later milestone) and no CMS
 * backend exists yet (M2, a later milestone) to author a real per-Page
 * Section list — so for Beta Milestone 1, every route renders directly
 * from this registry's own default Section arrangement, populated with
 * real data fetched through the Gateway. This is not a placeholder: it is
 * the literal, real fallback path `THEME_ENGINE_ARCHITECTURE.md` §3 step 4
 * ("always renders something... never a blank page") and §6's own `blank`
 * archetype already specify for exactly this pre-theme, pre-CMS state.
 *
 * `configuration` on each Section here is intentionally empty — this
 * milestone's own primitives (`primitives/*`) receive their real data as
 * explicit render props from the calling page (Server Component), not
 * through `configuration` (which is reserved for merchant-authored CMS
 * content, per `STOREFRONT_COMPONENT_ENGINE.md` §1's own "data-in,
 * markup-out" rule) — see `engine/renderSections.tsx`'s own docblock.
 */
import type { Section, ThemeTemplate } from './types.js';

// Beta Milestone 2 — the professional Homepage arrangement (this
// milestone's own build item 1). "Popular" is deliberately absent: no real
// sales-count/view-count signal exists anywhere in the Gateway to back it
// honestly (documented in MISSING_ECOMMERCE_FEATURES_AUDIT.md), and
// reusing another section's own data under a fabricated "Popular" label
// would imply a distinct algorithm that doesn't exist.
const homepageSections: Section[] = [
  { type: 'Hero', configuration: {}, key: 'hero' },
  { type: 'CategoryGrid', configuration: {}, key: 'category-grid' },
  { type: 'ProductGrid', configuration: {}, key: 'featured-products' },
  { type: 'ProductGrid', configuration: {}, key: 'trending-products' },
  { type: 'ProductGrid', configuration: {}, key: 'recently-added' },
  { type: 'BrandSlider', configuration: {}, key: 'brand-slider' },
  { type: 'TrustBar', configuration: {}, key: 'trust-bar' },
  { type: 'Newsletter', configuration: {}, key: 'newsletter' },
];

const categoryListingSections: Section[] = [{ type: 'ProductGrid', configuration: {}, key: 'category-products' }];

const brandListingSections: Section[] = [{ type: 'ProductGrid', configuration: {}, key: 'brand-products' }];

const collectionListingSections: Section[] = [{ type: 'ProductGrid', configuration: {}, key: 'collection-products' }];

const productDetailSections: Section[] = [{ type: 'ProductCard', configuration: {}, key: 'product-detail' }];

export const defaultTemplates: Record<ThemeTemplate['archetype'], ThemeTemplate> = {
  homepage: { archetype: 'homepage', defaultSections: homepageSections },
  'category-listing': { archetype: 'category-listing', defaultSections: categoryListingSections },
  'brand-listing': { archetype: 'brand-listing', defaultSections: brandListingSections },
  'collection-listing': { archetype: 'collection-listing', defaultSections: collectionListingSections },
  'product-detail': { archetype: 'product-detail', defaultSections: productDetailSections },
  'search-results': { archetype: 'search-results', defaultSections: [] },
  cart: { archetype: 'cart', defaultSections: [] },
  blank: { archetype: 'blank', defaultSections: [] },
};

/** Resolves a Template for the given archetype — a configured theme's own Template first, this registry's own default second, the real `blank` (empty) archetype last. Never throws; a Template always resolves to *something*, per `THEME_ENGINE_ARCHITECTURE.md` §3 step 4/§6. */
export function resolveTemplate(archetype: ThemeTemplate['archetype'], themeTemplates?: Partial<Record<ThemeTemplate['archetype'], ThemeTemplate>>): ThemeTemplate {
  return themeTemplates?.[archetype] ?? defaultTemplates[archetype] ?? defaultTemplates.blank;
}
