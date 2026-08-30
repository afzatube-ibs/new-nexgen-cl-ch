/**
 * Shapes real backend DTOs (src/backend/types.ts, confirmed against the
 * real Catalog Http\Resources) into the Storefront Component Engine's own
 * already-Accepted contracts (STOREFRONT_COMPONENT_ENGINE.md §2's
 * `ProductSummary`/`CategorySummary`/`BrandSummary`). This is the entire
 * meaning of "Gateway performs composition only" — every field below is
 * either passed through unchanged or reshaped (camelCase already matches;
 * image URLs go through lib/imageUrl.ts); nothing is computed, priced, or
 * decided here.
 *
 * KNOWN GAP (found this slice, not invented): the real `CategoryResource`
 * has no image field at all — Catalog's own Category model carries no
 * media reference. `CategorySummary.image` is therefore always `null`
 * today; documented in the Slice 1 report, not silently hidden.
 */
import { buildResponsiveImageOrNull, type ResponsiveImage } from '../lib/imageUrl.js';
import type { ComposedPrice } from './pricing.js';
import type { BackendBrand, BackendCategory, BackendCollection, BackendProduct, BackendProductImage, BackendSearchResult } from '../backend/types.js';

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: ResponsiveImage | null;
  /**
   * Real backend field (`BackendCategory.parentId`), added for Beta
   * Milestone 2: a mega-menu needs real category hierarchy to group
   * children under a top-level parent — this field already existed on the
   * backend DTO but was never mapped through until a real consumer
   * (the Storefront's own navigation) needed it. `null` for a top-level
   * category.
   */
  parentId: string | null;
  /** Real backend field (`BackendCategory.position`) — the merchant's own configured display order, used for nav/menu ordering rather than an arbitrary id/name sort. */
  position: number;
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: ResponsiveImage | null;
}

/**
 * `Collection` has no image field either (same real gap as `Category`,
 * confirmed by the same direct code read of `CollectionResource`). Its
 * member products are a separate call — `GET /v1/products?collection_id=`,
 * backed by `ProductController::index()`'s own real `collection_id` filter
 * (neXgen Production Sprint, Milestone 2 completion, mirroring the
 * existing `category_id` filter exactly) — not carried on this summary
 * type itself.
 */
export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  status: string;
  visibility: string;
  brandId: string | null;
  image: ResponsiveImage | null;
  /**
   * Milestone 2 — real, composed from Pricing (`composition/pricing.ts`),
   * `null` when no real price is configured for this SKU yet (never a
   * fabricated figure — `PriceBlock`'s own honest "Price coming soon"
   * state on the Storefront). Every caller of `toProductSummary` below
   * that has not been updated to pass a real price still compiles —
   * `price` defaults to `null`, the same honest "not composed here"
   * signal, never silently omitted from the type.
   */
  price: ComposedPrice | null;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  productType: string;
  metaTitle: string | null;
  metaDescription: string | null;
  images: ResponsiveImage[];
  categories: CategorySummary[];
  publishedAt: string | null;
}

function primaryImage(images: BackendProductImage[] | undefined): ResponsiveImage | null {
  if (!images || images.length === 0) return null;
  const primary = images.find((image) => image.isPrimary) ?? images[0]!;
  return buildResponsiveImageOrNull(primary.url, primary.altText);
}

export function toCategorySummary(category: BackendCategory): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: null, // see docblock — real backend has no Category image field
    parentId: category.parentId,
    position: category.position,
  };
}

export function toCollectionSummary(collection: BackendCollection): CollectionSummary {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
  };
}

export function toBrandSummary(brand: BackendBrand): BrandSummary {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    logo: buildResponsiveImageOrNull(brand.logoUrl, brand.name),
  };
}

export function toProductSummary(product: BackendProduct, price: ComposedPrice | null = null): ProductSummary {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    status: product.status,
    visibility: product.visibility,
    brandId: product.brandId,
    image: primaryImage(product.images),
    price,
  };
}

export function toProductDetail(product: BackendProduct, price: ComposedPrice | null = null): ProductDetail {
  return {
    ...toProductSummary(product, price),
    description: product.description,
    productType: product.productType,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    images: (product.images ?? []).map((image) => buildResponsiveImageOrNull(image.url, image.altText)).filter((image): image is ResponsiveImage => image !== null),
    categories: (product.categories ?? []).map(toCategorySummary),
    publishedAt: product.publishedAt,
  };
}

/**
 * The real `ProductSearchResultResource` exposes no `slug`, `status`, or
 * `visibility` (confirmed, backend/types.ts docblock) — this shape is
 * therefore intentionally narrower than `ProductSummary`, not a
 * short-cut. `id` here is the search index's own `productId`, the real
 * UUID a Storefront links to via this Gateway's `:id`-based product route.
 */
export interface SearchResultSummary {
  id: string;
  name: string;
  sku: string;
  brandId: string | null;
  publishedAt: string | null;
  relevanceScore: number | null;
  /** Milestone 2 — see `ProductSummary.price`'s own docblock; identical honest-null default. */
  price: ComposedPrice | null;
}

export function toSearchResultSummary(result: BackendSearchResult, price: ComposedPrice | null = null): SearchResultSummary {
  return {
    id: result.productId,
    name: result.name,
    sku: result.sku,
    brandId: result.brandId,
    publishedAt: result.publishedAt,
    relevanceScore: result.relevanceScore ?? null,
    price,
  };
}
