import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { CollectionDTO, CreateCollectionInput, UpdateCollectionInput } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `collections`, `catalog.collections.{view|manage}`. */
const BASE_PATH = '/collections';

function toCreateBody(input: CreateCollectionInput): Record<string, unknown> {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    position: input.position,
  };
}

function toUpdateBody(input: UpdateCollectionInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateCollectionInput), expected_version: expectedVersion };
}

export function listCollections(client: ApiClient, query?: ListQuery): Promise<ListEnvelope<CollectionDTO>> {
  return createResourceClient<CollectionDTO>(client, BASE_PATH).list(query);
}

export function getCollection(client: ApiClient, id: string): Promise<CollectionDTO> {
  return createResourceClient<CollectionDTO>(client, BASE_PATH).get(id);
}

export function createCollection(client: ApiClient, input: CreateCollectionInput): Promise<CollectionDTO> {
  return createResourceClient<CollectionDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateCollection(client: ApiClient, id: string, input: UpdateCollectionInput): Promise<CollectionDTO> {
  return createResourceClient<CollectionDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveCollection(client: ApiClient, id: string, expectedVersion: number): Promise<CollectionDTO> {
  return createResourceClient<CollectionDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyCollection(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<CollectionDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreCollection(client: ApiClient, id: string): Promise<CollectionDTO> {
  return createResourceClient<CollectionDTO>(client, BASE_PATH).restore(id);
}
