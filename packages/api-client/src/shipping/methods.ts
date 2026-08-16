import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient } from './resourceClient.js';
import type { ShippingMethodDTO, CreateShippingMethodInput, UpdateShippingMethodInput, ListShippingMethodsQuery } from './types.js';

/** `apps/backend/.../Shipping/routes.php` — `shipping-methods`, `shipping.methods.{view|manage}`. */
const BASE_PATH = '/shipping-methods';

function toCreateBody(input: CreateShippingMethodInput): Record<string, unknown> {
  return { code: input.code, name: input.name, description: input.description, provider_code: input.providerCode };
}

function toUpdateBody(input: UpdateShippingMethodInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { code: rest.code, name: rest.name, description: rest.description, provider_code: rest.providerCode, expected_version: expectedVersion };
}

/** `ShippingMethodController::index` — `status` and `page` only, hardcoded `orderBy('name')`. */
export function listShippingMethods(client: ApiClient, query?: ListShippingMethodsQuery): Promise<ListEnvelope<ShippingMethodDTO>> {
  return createResourceClient<ShippingMethodDTO>(client, BASE_PATH).list(query && { status: query.status, page: query.page });
}

export function getShippingMethod(client: ApiClient, id: string): Promise<ShippingMethodDTO> {
  return createResourceClient<ShippingMethodDTO>(client, BASE_PATH).get(id);
}

export function createShippingMethod(client: ApiClient, input: CreateShippingMethodInput): Promise<ShippingMethodDTO> {
  return createResourceClient<ShippingMethodDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateShippingMethod(client: ApiClient, id: string, input: UpdateShippingMethodInput): Promise<ShippingMethodDTO> {
  return createResourceClient<ShippingMethodDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveShippingMethod(client: ApiClient, id: string, expectedVersion: number): Promise<ShippingMethodDTO> {
  return createResourceClient<ShippingMethodDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyShippingMethod(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<ShippingMethodDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}
