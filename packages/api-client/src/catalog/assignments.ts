import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { ProductDTO } from './types.js';

/**
 * `PUT /products/{product}/{categories|collections|tags|options}` —
 * `Sync*Action` (apps/backend) each `sync()` their one relation and reload
 * only that one (`$product->load('categories')`, etc.) before returning —
 * so each response's `ProductDTO` has only the just-synced array populated;
 * every other nested field (variants, images, the other three assignment
 * types, attributeValues, relationships) is genuinely absent from that
 * response, not empty. Every hook that calls these (see
 * `products/editor/organization/organizationQueries.ts` and
 * `products/editor/variants/variantQueries.ts`) invalidates the full
 * product detail query afterward rather than writing this partial shape
 * into the cache directly — a full `GET /products/{id}` refetch is simpler
 * and safer than merging a partial nested response by hand.
 */
async function syncProduct(client: ApiClient, productId: string, segment: string, bodyKey: string, ids: string[]): Promise<ProductDTO> {
  const response = await client.put<DataEnvelope<ProductDTO>>(`/products/${productId}/${segment}`, { [bodyKey]: ids });
  return response.data;
}

export function syncProductCategories(client: ApiClient, productId: string, categoryIds: string[]): Promise<ProductDTO> {
  return syncProduct(client, productId, 'categories', 'category_ids', categoryIds);
}

export function syncProductCollections(client: ApiClient, productId: string, collectionIds: string[]): Promise<ProductDTO> {
  return syncProduct(client, productId, 'collections', 'collection_ids', collectionIds);
}

export function syncProductTags(client: ApiClient, productId: string, tagIds: string[]): Promise<ProductDTO> {
  return syncProduct(client, productId, 'tags', 'tag_ids', tagIds);
}

/** Sets which Options define a `configurable` product's variant dimensions (`product_options` — drives the Variant Matrix, not a display taxonomy). */
export function syncProductOptions(client: ApiClient, productId: string, optionIds: string[]): Promise<ProductDTO> {
  return syncProduct(client, productId, 'options', 'option_ids', optionIds);
}
