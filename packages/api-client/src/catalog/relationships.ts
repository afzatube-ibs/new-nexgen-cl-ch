import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { ProductRelationshipDTO, AddProductRelationshipInput } from './types.js';

function basePath(productId: string): string {
  return `/products/${productId}/relationships`;
}

export function listProductRelationships(client: ApiClient, productId: string): Promise<ListEnvelope<ProductRelationshipDTO>> {
  return client.get<ListEnvelope<ProductRelationshipDTO>>(basePath(productId));
}

/** `POST /products/{product}/relationships` — `AddProductRelationshipRequest` rejects `relatedProductId === productId` server-side ("A product cannot be related to itself."), surfaced as a normal 422. */
export async function addProductRelationship(client: ApiClient, productId: string, input: AddProductRelationshipInput): Promise<ProductRelationshipDTO> {
  const response = await client.post<DataEnvelope<ProductRelationshipDTO>>(basePath(productId), {
    related_product_id: input.relatedProductId,
    type: input.type,
  });
  return response.data;
}

export function removeProductRelationship(client: ApiClient, productId: string, relationshipId: string): Promise<void> {
  return client.delete<void>(`${basePath(productId)}/${relationshipId}`);
}
