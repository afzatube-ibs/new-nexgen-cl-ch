/**
 * Built-in fallback Template arrangement per page archetype.
 *
 * Until a real CMS/Homepage Builder owns merchant-authored sections, the
 * fallback must render only experiences backed by real platform data. It
 * deliberately excludes policy/trust claims and newsletter signup because
 * those customer promises do not yet have merchant-configured data sources.
 */
import type { Section, ThemeTemplate } from './types.js';

const homepageSections: Section[] = [
  { type: 'Hero', configuration: {}, key: 'hero' },
  { type: 'ProductGrid', configuration: {}, key: 'featured-products' },
  { type: 'CategoryGrid', configuration: {}, key: 'category-grid' },
  { type: 'ProductGrid', configuration: {}, key: 'trending-products' },
  { type: 'ProductGrid', configuration: {}, key: 'recently-added' },
  { type: 'BrandSlider', configuration: {}, key: 'brand-slider' },
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

/** Resolves configured theme Template first, built-in fallback second, and the real blank archetype last. */
export function resolveTemplate(archetype: ThemeTemplate['archetype'], themeTemplates?: Partial<Record<ThemeTemplate['archetype'], ThemeTemplate>>): ThemeTemplate {
  return themeTemplates?.[archetype] ?? defaultTemplates[archetype] ?? defaultTemplates.blank;
}
