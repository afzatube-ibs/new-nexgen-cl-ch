import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { ProductImageDTO, AddProductImageInput, UpdateProductImageInput } from './types.js';

function basePath(productId: string): string {
  return `/products/${productId}/images`;
}

/** `GET /products/{product}/images` — `ProductImageController::index` eager-loads `media`, ordered by `position`. */
export function listProductImages(client: ApiClient, productId: string): Promise<ListEnvelope<ProductImageDTO>> {
  return client.get<ListEnvelope<ProductImageDTO>>(basePath(productId));
}

/** `POST /products/{product}/images` — attaches an already-uploaded `MediaAsset` (see `media.ts`'s `uploadMedia`) to this product; upload and attach are two separate steps against two separate aggregates. */
export async function addProductImage(client: ApiClient, productId: string, input: AddProductImageInput): Promise<ProductImageDTO> {
  const response = await client.post<DataEnvelope<ProductImageDTO>>(basePath(productId), {
    media_id: input.mediaId,
    position: input.position,
    is_primary: input.isPrimary,
  });
  return response.data;
}

export async function updateProductImage(
  client: ApiClient,
  productId: string,
  imageId: string,
  input: UpdateProductImageInput,
): Promise<ProductImageDTO> {
  const response = await client.patch<DataEnvelope<ProductImageDTO>>(`${basePath(productId)}/${imageId}`, {
    position: input.position,
    is_primary: input.isPrimary,
  });
  return response.data;
}

/** No `expected_version` — `ProductImage` carries no lock version of its own (part of Product's aggregate, per the model's docblock); `UpdateProductImageRequest`/the image routes require none. */
export function destroyProductImage(client: ApiClient, productId: string, imageId: string): Promise<void> {
  return client.delete<void>(`${basePath(productId)}/${imageId}`);
}
