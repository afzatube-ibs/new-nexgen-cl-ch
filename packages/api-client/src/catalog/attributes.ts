import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { AttributeDTO, CreateAttributeInput, UpdateAttributeInput } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `attributes`, `catalog.attributes.{view|manage}`. No archive route. */
const BASE_PATH = '/attributes';

function toCreateBody(input: CreateAttributeInput): Record<string, unknown> {
  return {
    attribute_group_id: input.attributeGroupId,
    code: input.code,
    name: input.name,
    type: input.type,
    is_filterable: input.isFilterable,
    position: input.position,
  };
}

function toUpdateBody(input: UpdateAttributeInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateAttributeInput), expected_version: expectedVersion };
}

export function listAttributes(client: ApiClient, query?: ListQuery): Promise<ListEnvelope<AttributeDTO>> {
  return createResourceClient<AttributeDTO>(client, BASE_PATH).list(query);
}

export function getAttribute(client: ApiClient, id: string): Promise<AttributeDTO> {
  return createResourceClient<AttributeDTO>(client, BASE_PATH).get(id);
}

export function createAttribute(client: ApiClient, input: CreateAttributeInput): Promise<AttributeDTO> {
  return createResourceClient<AttributeDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateAttribute(client: ApiClient, id: string, input: UpdateAttributeInput): Promise<AttributeDTO> {
  return createResourceClient<AttributeDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function destroyAttribute(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<AttributeDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreAttribute(client: ApiClient, id: string): Promise<AttributeDTO> {
  return createResourceClient<AttributeDTO>(client, BASE_PATH).restore(id);
}
