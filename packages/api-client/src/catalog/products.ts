import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { ProductDTO, CreateProductInput, UpdateProductInput, ListProductsQuery } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `products`, `catalog.products.{view|manage}`. Slice 1: General + SEO fields only — see PROJECT_STATUS.md for Variants/Media/Organization/Relations/Attribute-values/Audit, deferred to Slice 2. */
const BASE_PATH = '/products';

function toCreateBody(input: CreateProductInput): Record<string, unknown> {
  return {
    brand_id: input.brandId,
    sku: input.sku,
    barcode: input.barcode,
    name: input.name,
    slug: input.slug,
    description: input.description,
    short_description: input.shortDescription,
    product_type: input.productType,
    visibility: input.visibility,
    meta_title: input.metaTitle,
    meta_description: input.metaDescription,
    meta_keywords: input.metaKeywords,
  };
}

function toUpdateBody(input: UpdateProductInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateProductInput), expected_version: expectedVersion };
}

/** `GET /products` — `ProductController::index` supports `status`/`visibility`/`brand_id`/`category_id`/`search` (name/sku LIKE)/`sort`/`direction`. */
export function listProducts(client: ApiClient, query?: ListProductsQuery): Promise<ListEnvelope<ProductDTO>> {
  return createResourceClient<ProductDTO>(client, BASE_PATH).list(
    query && {
      status: query.status,
      visibility: query.visibility,
      brand_id: query.brandId,
      category_id: query.categoryId,
      search: query.search,
      sort: query.sort,
      direction: query.direction,
      page: query.page,
      per_page: query.perPage,
    },
  );
}

export function getProduct(client: ApiClient, id: string): Promise<ProductDTO> {
  return createResourceClient<ProductDTO>(client, BASE_PATH).get(id);
}

export function createProduct(client: ApiClient, input: CreateProductInput): Promise<ProductDTO> {
  return createResourceClient<ProductDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateProduct(client: ApiClient, id: string, input: UpdateProductInput): Promise<ProductDTO> {
  return createResourceClient<ProductDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

/**
 * `POST /products/{product}/publish` — `PublishProductAction` (apps/backend)
 * gates `draft -> active` on a real completeness check (name, sku, >=1
 * category, and >=1 variant if `product_type === 'configurable'`), throwing
 * `ProductNotReadyToPublishException` (422) if not met. Verified live
 * (Phase 2.2A) that the response has no `details` key — the reason is a
 * single combined sentence in `ValidationApiError.message` (e.g. "...it is
 * not assigned to at least one category."), not a `details.reasons` array
 * as earlier assumed. The UI surfaces it verbatim either way — see
 * `ProductFormPage` — rather than re-deriving the rule client-side
 * (headless-first: the backend stays the one source of truth for this
 * business rule).
 */
export async function publishProduct(client: ApiClient, id: string, expectedVersion: number): Promise<ProductDTO> {
  const response = await client.post<DataEnvelope<ProductDTO>>(`${BASE_PATH}/${id}/publish`, { expected_version: expectedVersion });
  return response.data;
}

export function archiveProduct(client: ApiClient, id: string, expectedVersion: number): Promise<ProductDTO> {
  return createResourceClient<ProductDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyProduct(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<ProductDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreProduct(client: ApiClient, id: string): Promise<ProductDTO> {
  return createResourceClient<ProductDTO>(client, BASE_PATH).restore(id);
}
