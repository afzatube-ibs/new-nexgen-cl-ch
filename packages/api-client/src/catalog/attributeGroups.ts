import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { AttributeGroupDTO, CreateAttributeGroupInput, UpdateAttributeGroupInput } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `attribute-groups`, `catalog.attributes.{view|manage}` (shared with Attributes). No archive route. */
const BASE_PATH = '/attribute-groups';

function toCreateBody(input: CreateAttributeGroupInput): Record<string, unknown> {
  return { code: input.code, name: input.name, position: input.position };
}

function toUpdateBody(input: UpdateAttributeGroupInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateAttributeGroupInput), expected_version: expectedVersion };
}

export function listAttributeGroups(client: ApiClient, query?: ListQuery): Promise<ListEnvelope<AttributeGroupDTO>> {
  return createResourceClient<AttributeGroupDTO>(client, BASE_PATH).list(query);
}

export function getAttributeGroup(client: ApiClient, id: string): Promise<AttributeGroupDTO> {
  return createResourceClient<AttributeGroupDTO>(client, BASE_PATH).get(id);
}

export function createAttributeGroup(client: ApiClient, input: CreateAttributeGroupInput): Promise<AttributeGroupDTO> {
  return createResourceClient<AttributeGroupDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateAttributeGroup(
  client: ApiClient,
  id: string,
  input: UpdateAttributeGroupInput,
): Promise<AttributeGroupDTO> {
  return createResourceClient<AttributeGroupDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function destroyAttributeGroup(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<AttributeGroupDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreAttributeGroup(client: ApiClient, id: string): Promise<AttributeGroupDTO> {
  return createResourceClient<AttributeGroupDTO>(client, BASE_PATH).restore(id);
}
