import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { ProductVariantDTO, AddProductVariantInput, UpdateProductVariantInput } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `products/{product}/variants`, `catalog.products.{view|manage}`. */
function basePath(productId: string): string {
  return `/products/${productId}/variants`;
}

/** `GET /products/{product}/variants` — `ProductVariantController::index` eager-loads `optionValues`, ordered by `position`. */
export function listProductVariants(client: ApiClient, productId: string): Promise<ListEnvelope<ProductVariantDTO>> {
  return client.get<ListEnvelope<ProductVariantDTO>>(basePath(productId));
}

/** `POST /products/{product}/variants` — `AddProductVariantAction` rejects a non-`configurable` product and any option value not already assigned to the product via `SyncProductOptionsAction`, both server-side. */
export async function addProductVariant(client: ApiClient, productId: string, input: AddProductVariantInput): Promise<ProductVariantDTO> {
  const response = await client.post<DataEnvelope<ProductVariantDTO>>(basePath(productId), {
    sku: input.sku,
    barcode: input.barcode,
    position: input.position,
    option_value_ids: input.optionValueIds,
  });
  return response.data;
}

export async function updateProductVariant(
  client: ApiClient,
  productId: string,
  variantId: string,
  input: UpdateProductVariantInput,
): Promise<ProductVariantDTO> {
  const { expectedVersion, ...rest } = input;
  const response = await client.patch<DataEnvelope<ProductVariantDTO>>(`${basePath(productId)}/${variantId}`, {
    sku: rest.sku,
    barcode: rest.barcode,
    position: rest.position,
    expected_version: expectedVersion,
  });
  return response.data;
}

export async function archiveProductVariant(client: ApiClient, productId: string, variantId: string, expectedVersion: number): Promise<ProductVariantDTO> {
  const response = await client.post<DataEnvelope<ProductVariantDTO>>(`${basePath(productId)}/${variantId}/archive`, {
    expected_version: expectedVersion,
  });
  return response.data;
}

export function destroyProductVariant(client: ApiClient, productId: string, variantId: string, expectedVersion: number): Promise<void> {
  return client.delete<void>(`${basePath(productId)}/${variantId}`, { expected_version: expectedVersion });
}
