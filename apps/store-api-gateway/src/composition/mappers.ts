/**
 * Shapes real backend DTOs into the Storefront Component Engine's contracts.
 * Every commerce field is passed through from an owning backend module or
 * reshaped for transport; Gateway does not invent catalog, price or stock.
 */
import { buildResponsiveImageOrNull, type ResponsiveImage } from '../lib/imageUrl.js';
import type { ComposedAvailability } from './availability.js';
import type { ComposedPrice } from './pricing.js';
import type { BackendBrand, BackendCategory, BackendCollection, BackendProduct, BackendProductImage, BackendSearchResult } from '../backend/types.js';

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: ResponsiveImage | null;
  parentId: string | null;
  position: number;
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: ResponsiveImage | null;
}

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
  price: ComposedPrice | null;
  /** Real Inventory composition; null means Inventory could not establish a truthful answer. */
  availability: ComposedAvailability | null;
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
    image: null,
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

export function toProductSummary(
  product: BackendProduct,
  price: ComposedPrice | null = null,
  availability: ComposedAvailability | null = null,
): ProductSummary {
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
    availability,
  };
}

export function toProductDetail(
  product: BackendProduct,
  price: ComposedPrice | null = null,
  availability: ComposedAvailability | null = null,
): ProductDetail {
  return {
    ...toProductSummary(product, price, availability),
    description: product.description,
    productType: product.productType,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    images: (product.images ?? [])
      .map((image) => buildResponsiveImageOrNull(image.url, image.altText))
      .filter((image): image is ResponsiveImage => image !== null),
    categories: (product.categories ?? []).map(toCategorySummary),
    publishedAt: product.publishedAt,
  };
}

export interface SearchResultSummary {
  id: string;
  name: string;
  sku: string;
  brandId: string | null;
  publishedAt: string | null;
  relevanceScore: number | null;
  price: ComposedPrice | null;
  availability: ComposedAvailability | null;
}

export function toSearchResultSummary(
  result: BackendSearchResult,
  price: ComposedPrice | null = null,
  availability: ComposedAvailability | null = null,
): SearchResultSummary {
  return {
    id: result.productId,
    name: result.name,
    sku: result.sku,
    brandId: result.brandId,
    publishedAt: result.publishedAt,
    relevanceScore: result.relevanceScore ?? null,
    price,
    availability,
  };
}
