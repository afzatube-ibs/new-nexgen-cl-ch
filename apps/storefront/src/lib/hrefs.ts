import { buildIdSlugSegment, type BrandSummary, type CategorySummary, type CollectionSummary, type ProductSummary } from '@nexgen/storefront-engine';

/** Real route-building helpers — the one place `routing/idSlug.ts`'s composite-segment scheme is applied, so every page composes hrefs identically rather than re-deriving the URL shape per call site. */
export const productHref = (product: Pick<ProductSummary, 'id' | 'name'>): string => `/products/${buildIdSlugSegment(product.id, product.name)}`;
export const categoryHref = (category: Pick<CategorySummary, 'id' | 'name'>): string => `/categories/${buildIdSlugSegment(category.id, category.name)}`;
export const brandHref = (brand: Pick<BrandSummary, 'id' | 'name'>): string => `/brands/${buildIdSlugSegment(brand.id, brand.name)}`;
export const collectionHref = (collection: Pick<CollectionSummary, 'id' | 'name'>): string => `/collections/${buildIdSlugSegment(collection.id, collection.name)}`;
