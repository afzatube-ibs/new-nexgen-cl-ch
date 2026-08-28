/**
 * DTOs mirroring the real backend's own Catalog/Search Http\Resources
 * exactly (field-for-field, confirmed by direct code read of ProductResource,
 * CategoryResource, BrandResource, ProductImageResource,
 * ProductSearchResultResource — apps/backend/app/Domains/Commerce/{Catalog,
 * Search}). Nothing here is invented — per this phase's own "Gateway
 * performs composition only" rule, these types exist so the composition
 * layer (routes/catalog.ts) is fully typed, never so a field can be added
 * that the real backend doesn't actually return.
 */

export interface BackendProduct {
  id: string;
  brandId: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  productType: 'simple' | 'configurable' | 'digital';
  weightGrams: number | null;
  status: 'draft' | 'active' | 'archived';
  visibility: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  metadata: Record<string, unknown> | null;
  publishedAt: string | null;
  categories?: BackendCategory[];
  collections?: BackendCollection[];
  tags?: BackendTag[];
  images?: BackendProductImage[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackendCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackendBrand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoMediaId: string | null;
  logoUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackendCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  version: number;
}

export interface BackendTag {
  id: string;
  name: string;
  slug: string;
}

export interface BackendProductImage {
  id: string;
  mediaId: string;
  url: string | null;
  altText: string | null;
  position: number;
  isPrimary: boolean;
}

/**
 * Mirrors the real `ProductSearchResultResource` exactly (confirmed by
 * direct code read, apps/backend/.../Search/Http/Resources) — note there is
 * NO `slug`, `status`, or `visibility` field on a search result today,
 * only `productId`/`sku`/`name`/`brandId`/`publishedAt`/optional
 * `relevanceScore`. A search result links to a product via `productId`
 * (the real UUID), consistent with this Gateway's own `:id`-based product
 * detail route (see composition/mappers.ts docblock on the missing-slug
 * finding).
 */
export interface BackendSearchResult {
  productId: string;
  sku: string;
  name: string;
  brandId: string | null;
  publishedAt: string | null;
  relevanceScore?: number;
}

/**
 * Milestone 2 — field-for-field matched to the real backend's own
 * `Commerce\Pricing\Http\Resources\PriceListEntryResource`, returned by
 * `GET pricing/lookup-many` (`composition/pricing.ts`). `basePrice`/
 * `compareAtPrice`/`salePrice` are real decimal strings (e.g. `"2490.0000"`)
 * — never a JSON number — per that Resource's own `decimal:4`-cast fields.
 */
export interface BackendPriceListEntry {
  id: string;
  priceListId: string;
  sku: string;
  basePrice: string;
  compareAtPrice: string | null;
  salePrice: string | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  isSaleActive: boolean;
  effectivePrice: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Laravel's default paginator meta shape — confirmed empirically against
 * the real backend during this slice's own live verification (§ Slice 1
 * report). Read defensively (both possible casings) since this Gateway
 * must never assume a shape it hasn't verified against a real response.
 */
export interface BackendPaginationMeta {
  current_page?: number;
  currentPage?: number;
  last_page?: number;
  lastPage?: number;
  per_page?: number;
  perPage?: number;
  total?: number;
}

export interface BackendListResponse<T> {
  data: T[];
  meta?: BackendPaginationMeta;
}

export interface BackendItemResponse<T> {
  data: T;
}
