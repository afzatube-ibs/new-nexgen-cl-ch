import 'server-only';
import { gatewayFetch, gatewayFetchList, type GatewayFetchOptions } from './client.js';
import type { BrandSummary, CategorySummary, CollectionSummary, HomepageData, PaginationMeta, ProductDetail, ProductSummary, StorefrontBranding } from './types.js';

/**
 * Typed wrappers over the Gateway's own real `/v1/*` Catalog routes
 * (`apps/store-api-gateway/src/routes/catalog.ts`) — the concrete
 * "Gateway Integration Layer" (typed clients, per this milestone's own
 * required build item) every Server Component in `apps/storefront` calls
 * through, never `fetch()` ad hoc per page.
 *
 * Cache windows mirror this milestone's own SSG+ISR rendering strategy
 * (`STORE_FRONTEND_ARCHITECTURE.md` §2) — chosen independently of, but
 * consistent in spirit with, the Gateway's own Redis TTLs (a second,
 * complementary cache layer per that document's own §4 item 2, not a
 * duplicate of the first).
 */

export interface ListResult<T> {
  data: T[];
  pagination?: PaginationMeta;
}

export function getHomepage(options: GatewayFetchOptions = {}): Promise<HomepageData> {
  return gatewayFetch<HomepageData>('/v1/homepage', { revalidateSeconds: 120, tags: ['catalog:categories', 'catalog:brands', 'catalog:products'], ...options });
}

/**
 * Beta Experience Pack 1 — `GET /v1/branding` (`apps/store-api-gateway/
 * src/routes/branding.ts`), the real merchant-published brand identity
 * (store name, logo, favicon, colors, announcement, social links). Short
 * `revalidateSeconds` relative to Catalog's own — a merchant publishing a
 * brand change (`APPEARANCE_WORKSPACE_SPECIFICATION.md` §10) should reach
 * real customers quickly, not wait out a multi-minute ISR window the way
 * a product listing reasonably can.
 */
export function getBranding(options: GatewayFetchOptions = {}): Promise<StorefrontBranding> {
  return gatewayFetch<StorefrontBranding>('/v1/branding', { revalidateSeconds: 60, tags: ['branding'], ...options });
}

export function getCategories(options: GatewayFetchOptions = {}): Promise<ListResult<CategorySummary>> {
  return gatewayFetchList<CategorySummary>('/v1/categories', { revalidateSeconds: 300, tags: ['catalog:categories'], ...options });
}

export function getCategory(id: string, options: GatewayFetchOptions = {}): Promise<CategorySummary> {
  return gatewayFetch<CategorySummary>(`/v1/categories/${id}`, { revalidateSeconds: 300, tags: ['catalog:categories', `catalog:category:${id}`], ...options });
}

export function getBrands(options: GatewayFetchOptions = {}): Promise<ListResult<BrandSummary>> {
  return gatewayFetchList<BrandSummary>('/v1/brands', { revalidateSeconds: 300, tags: ['catalog:brands'], ...options });
}

export function getBrand(id: string, options: GatewayFetchOptions = {}): Promise<BrandSummary> {
  return gatewayFetch<BrandSummary>(`/v1/brands/${id}`, { revalidateSeconds: 300, tags: ['catalog:brands', `catalog:brand:${id}`], ...options });
}

export function getCollections(options: GatewayFetchOptions = {}): Promise<ListResult<CollectionSummary>> {
  return gatewayFetchList<CollectionSummary>('/v1/collections', { revalidateSeconds: 300, tags: ['catalog:collections'], ...options });
}

export function getCollection(id: string, options: GatewayFetchOptions = {}): Promise<CollectionSummary> {
  return gatewayFetch<CollectionSummary>(`/v1/collections/${id}`, { revalidateSeconds: 300, tags: ['catalog:collections', `catalog:collection:${id}`], ...options });
}

export interface GetProductsFilters {
  categoryId?: string;
  brandId?: string;
  page?: number;
  perPage?: number;
  sort?: 'name' | 'sku' | 'created_at' | 'published_at';
  direction?: 'asc' | 'desc';
}

export function getProducts(filters: GetProductsFilters = {}, options: GatewayFetchOptions = {}): Promise<ListResult<ProductSummary>> {
  const tags = ['catalog:products'];
  if (filters.categoryId) tags.push(`catalog:category:${filters.categoryId}`);
  if (filters.brandId) tags.push(`catalog:brand:${filters.brandId}`);
  return gatewayFetchList<ProductSummary>('/v1/products', {
    query: {
      category_id: filters.categoryId,
      brand_id: filters.brandId,
      page: filters.page,
      per_page: filters.perPage,
      sort: filters.sort,
      direction: filters.direction,
    },
    revalidateSeconds: 180,
    tags,
    ...options,
  });
}

export function getProduct(id: string, options: GatewayFetchOptions = {}): Promise<ProductDetail> {
  return gatewayFetch<ProductDetail>(`/v1/products/${id}`, { revalidateSeconds: 180, tags: ['catalog:products', `catalog:product:${id}`], ...options });
}
